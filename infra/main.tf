# preprod — un entorno entero, escrito.
#
# No existe hasta que esto se aplica, y desaparece entero con un destroy. Es un
# TERCER entorno: convive con los QA y PROD que levanta el pipeline (TP6) sin
# pisarlos, porque no comparte ni nombres, ni puertos, ni red, ni volumen.
#
# Riel: plan C del enunciado (Terraform + provider Docker, 100% local). Es el
# que corresponde porque mis QA y PROD ya corren asi, sobre mi propio runner.

terraform {
  required_version = ">= 1.5"

  required_providers {
    docker = {
      source = "kreuzwerker/docker"
      # Fijada por version: sin esto, un `init` de marzo puede bajar un
      # provider con otro comportamiento y el mismo codigo dejaria de
      # reproducir el mismo entorno. El .terraform.lock.hcl ademas fija los
      # hashes de los binarios, y ESE si se versiona.
      #
      # La 4.x porque es la mayor vigente y la que nombra la guia. Probe las
      # dos: ninguna detecta que alguien desconecte un contenedor de su red a
      # mano -- el refresh no vuelve a leer networks_advanced, asi que eso es
      # drift que Terraform NO puede ver, y se repara con -replace.
      version = "~> 4.0"
    }
  }

  # El path no va escrito aca: se pasa con -backend-config en el init, y apunta
  # a $HOME/tfstate/, FUERA de este workspace.
  #
  # El motivo es concreto: actions/checkout corre `git clean -ffdx` antes de
  # cada checkout, y la bandera -x borra tambien los archivos ignorados por
  # git. Si el estado viviera en infra/terraform.tfstate --justamente porque
  # esta en el .gitignore-- cada corrida del runner lo borraria, y el plan
  # diria "crear todo" para siempre sin que se entienda por que.
  backend "local" {}
}

# Sin credenciales: habla con el Docker de esta maquina, el mismo daemon del TP2.
provider "docker" {}

locals {
  # Un solo lugar donde se decide el prefijo. Los nombres de QA y PROD los pone
  # Compose (`qa-*`, `prod-*`), asi que `preprod-*` no puede chocar con ellos.
  prefijo = "preprod"

  # La imagen es la MISMA que el pipeline del TP7 construyo, verifico y
  # publico, identificada por el commit. preprod no reconstruye nada.
  imagen_api   = "ghcr.io/josedlpena3/ingsoft3-tp01-backend:${var.api_tag}"
  imagen_front = "ghcr.io/josedlpena3/ingsoft3-tp01-frontend:${var.api_tag}"
}

# ─── La red y el volumen: lo que sostiene al entorno ────────────────────────

resource "docker_network" "preprod" {
  name = "${local.prefijo}-net"
}

resource "docker_volume" "db_data" {
  name = "${local.prefijo}-db-data"

  # Probe poner prevent_destroy = true aca y el destroy se niega con "Instance
  # cannot be destroyed", ANTES de tocar nada: es un error de plan, asi que no
  # alcanza a destruir ni el primer recurso. Lo saque a proposito: preprod es
  # un entorno desechable y tiene que poder morir con un comando. En
  # produccion iria al reves -- ahi el volumen ES el dato, y un destroy
  # distraido se lo lleva.
}

# ─── La base ────────────────────────────────────────────────────────────────

resource "docker_image" "mongo" {
  name = "mongo:7"
  # Las imagenes del pipeline son solo linux/amd64 y esta maquina es ARM
  # (TP6: el multi-arquitectura bajo QEMU tardaba mas de 20 minutos). Docker
  # Desktop las corre con Rosetta. Mongo si tiene variante ARM, pero se fija
  # igual para que todo el entorno corra en la misma arquitectura.
  platform = "linux/amd64"

  # La imagen NO es de preprod: la construyo y publico el pipeline del TP7, y
  # QA y PROD estan corriendo la misma. preprod la USA, no la posee.
  #
  # Sin esto el destroy sale con codigo 1: el provider intenta borrar la imagen
  # local y Docker se niega --"conflict: unable to delete ... container X is
  # using its referenced image"-- porque los contenedores de QA y PROD la
  # tienen tomada. keep_locally saca la imagen del estado sin tocar el binario
  # compartido, que es lo correcto: destruir preprod no puede llevarse algo que
  # no le pertenece.
  keep_locally = true
}

resource "docker_container" "db" {
  name    = "${local.prefijo}-db"
  image   = docker_image.mongo.image_id
  restart = "unless-stopped"

  env = [
    "MONGO_INITDB_ROOT_USERNAME=${var.db_usuario}",
    "MONGO_INITDB_ROOT_PASSWORD=${var.db_password}",
    "MONGO_INITDB_DATABASE=${var.db_nombre}",
  ]

  networks_advanced {
    name = docker_network.preprod.name
  }

  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/data/db"
  }

  # No la expone al host a proposito: a la base solo le habla la api, por la
  # red interna. Un puerto publicado seria una puerta que nadie necesita.

  healthcheck {
    test     = ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
}

# ─── La api ─────────────────────────────────────────────────────────────────

resource "docker_image" "api" {
  name     = local.imagen_api
  platform = "linux/amd64"

  # La imagen NO es de preprod: la construyo y publico el pipeline del TP7, y
  # QA y PROD estan corriendo la misma. preprod la USA, no la posee.
  #
  # Sin esto el destroy sale con codigo 1: el provider intenta borrar la imagen
  # local y Docker se niega --"conflict: unable to delete ... container X is
  # using its referenced image"-- porque los contenedores de QA y PROD la
  # tienen tomada. keep_locally saca la imagen del estado sin tocar el binario
  # compartido, que es lo correcto: destruir preprod no puede llevarse algo que
  # no le pertenece.
  keep_locally = true
}

resource "docker_container" "api" {
  name  = "${local.prefijo}-api"
  image = docker_image.api.image_id

  # No es decorativo. `depends_on` espera a que el contenedor de la base se
  # CREE, no a que Mongo este listo para aceptar conexiones -- el "arranco !=
  # esta listo" del TP2, que Compose resolvia con healthcheck +
  # service_healthy. Y este backend hace process.exit() si no puede conectar,
  # asi que sin esto la api se muere una vez y queda muerta. Con esto, Docker
  # la reintenta hasta que Mongo contesta.
  restart = "unless-stopped"

  env = [
    # DERIVADA, no copiada: el host sale del nombre real del contenedor de la
    # base. Si mañana le cambio el prefijo, la cadena lo sigue sola. Copiarla a
    # mano seria volver a tener dos verdades que hay que acordarse de sincronizar.
    "MONGO_URL=mongodb://${var.db_usuario}:${var.db_password}@${docker_container.db.name}:27017/${var.db_nombre}?authSource=admin",
    "PORT=8080",
    # El mismo dato que el pipeline le pasa a QA y PROD: /health devuelve el
    # commit, asi que preprod tambien puede decir QUE esta corriendo.
    "APP_COMMIT=${var.api_tag}",
  ]

  networks_advanced {
    name = docker_network.preprod.name
  }

  ports {
    internal = 8080
    external = var.puerto_api
  }

  depends_on = [docker_container.db]
}

# ─── El front ───────────────────────────────────────────────────────────────

resource "docker_image" "front" {
  name     = local.imagen_front
  platform = "linux/amd64"

  # La imagen NO es de preprod: la construyo y publico el pipeline del TP7, y
  # QA y PROD estan corriendo la misma. preprod la USA, no la posee.
  #
  # Sin esto el destroy sale con codigo 1: el provider intenta borrar la imagen
  # local y Docker se niega --"conflict: unable to delete ... container X is
  # using its referenced image"-- porque los contenedores de QA y PROD la
  # tienen tomada. keep_locally saca la imagen del estado sin tocar el binario
  # compartido, que es lo correcto: destruir preprod no puede llevarse algo que
  # no le pertenece.
  keep_locally = true
}

resource "docker_container" "front" {
  name    = "${local.prefijo}-front"
  image   = docker_image.front.image_id
  restart = "unless-stopped"

  env = [
    # DERIVADA tambien: la direccion del backend sale del nombre real del
    # contenedor de la api. nginx la resuelve con envsubst al ARRANCAR, que es
    # lo que permite que la MISMA imagen del TP7 sirva en QA, en PROD y aca.
    "BACKEND_URL=http://${docker_container.api.name}:8080",
  ]

  networks_advanced {
    name = docker_network.preprod.name
  }

  ports {
    internal = 80
    external = var.puerto_front
  }

  depends_on = [docker_container.api]
}
