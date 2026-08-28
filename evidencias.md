# Evidencias

Documento acumulativo. **Los TP3 y TP4 no tienen sección acá a propósito**: sus entregables son un
GitHub Project público y la pestaña *Actions* de este repositorio, que se ven en vivo sin capturas.

---

## TP1 — Git colaborativo

### 1. Push directo a main rechazado
![push rechazado](img/TP1_evidencia1.png)
GitHub rechaza el push porque main está protegida y la regla alcanza también al dueño del repo.

### 2. El PR de la rama B no se puede mergear: conflicto
![aviso de conflicto](img/TP1_evidencia2.png)
Ambas ramas modificaron la misma línea del README, así que GitHub no puede fusionar automáticamente.

### 3. Marcadores de conflicto en el editor de GitHub
![marcadores](img/TP1_evidencia3.png)
Arriba de `=======` está la versión de la rama que se está mergeando (B); abajo, la que ya estaba en main (A).

### 4. Release v1.0.0 publicada
![release](img/TP1_evidencia4.png)
Primera versión estable del TP, tagueada con semver sobre main.



---

## TP2 — Contenedores

> Todas las salidas de esta sección se regeneraron sobre el **repositorio consolidado**, clonándolo
> limpio desde GitHub. Por eso los contenedores se llaman `ingsoft3-tp01-*`: Compose toma el nombre
> del proyecto de la carpeta. Es exactamente lo que ve cualquiera que clone el repo hoy y siga el
> `README.md`.

### 1. Levantar el sistema desde cero

Los tres pasos del README, sobre un clon limpio:

    git clone https://github.com/Josedlpena3/ingsoft3-tp01.git
    cd ingsoft3-tp01
    cp .env.example .env          # y completar usuario y contraseña de Mongo
    docker compose up -d --build

Compose respeta el orden que declara el `depends_on` con `condition: service_healthy` — se ve que
espera a que la base esté sana antes de arrancar el backend:

     Container ingsoft3-tp01-db-1        Started
     Container ingsoft3-tp01-db-1        Waiting
     Container ingsoft3-tp01-db-1        Healthy
     Container ingsoft3-tp01-backend-1   Started
     Container ingsoft3-tp01-frontend-1  Started

Comando:

    docker compose ps

Resultado:

    NAME                       IMAGE                    SERVICE    STATUS
    ingsoft3-tp01-backend-1    ingsoft3-tp01-backend    backend    Up 13 seconds
    ingsoft3-tp01-db-1         mongo:7                  db         Up 19 seconds (healthy)
    ingsoft3-tp01-frontend-1   ingsoft3-tp01-frontend   frontend   Up 13 seconds

Los tres servicios levantan **construyendo las imágenes localmente** (no bajándolas del registry:
la columna IMAGE muestra `ingsoft3-tp01-backend`, no `ghcr.io/...`), y la base pasa el healthcheck.

### 2. El sistema funcionando end-to-end

El backend encontró la base por el nombre de servicio de la red de Compose:

    docker compose logs backend

    backend-1  | Server is running on port 8080.
    backend-1  | Connected to the database!

Y las dos rutas responden a través de nginx, que sirve la SPA y hace de proxy reverso hacia el
backend:

    curl -o /dev/null -w '%{http_code}' http://localhost:8081/              -> 200
    curl -w '%{http_code}' http://localhost:8081/api/tutorials              -> 200
    []

La segunda es la que prueba el recorrido completo **navegador → nginx → backend → MongoDB**: la
petición sale a `/api/...` (ruta relativa, mismo origen), nginx la reenvía a `backend:8080` por el
DNS interno de Docker, y el backend responde con lo que hay en la base — un array vacío, porque la
base recién nace.

### 3. Prueba de persistencia

#### 3.1 Creación de un dato

Comando:

    curl -X POST http://localhost:8081/api/tutorials \
      -H "Content-Type: application/json" \
      -d '{"title":"Prueba de persistencia","description":"creado antes del down"}'

Resultado:

    {"title":"Prueba de persistencia","description":"creado antes del down","published":false,
     "createdAt":"2026-08-28T21:44:49.013Z","updatedAt":"2026-08-28T21:44:49.013Z",
     "id":"6a9201513f578b4f049c9233"}

#### 3.2 `down` / `up` SIN `-v`: los datos sobreviven

Comandos:

    docker compose down
    docker compose up -d
    curl http://localhost:8081/api/tutorials

En el `down` se borran los contenedores y la red, pero **el volumen no aparece en la lista de lo
eliminado**:

     Container ingsoft3-tp01-frontend-1  Removed
     Container ingsoft3-tp01-backend-1   Removed
     Container ingsoft3-tp01-db-1        Removed
     Network ingsoft3-tp01_tienda_net    Removed

Resultado de la consulta después de volver a levantar:

    [{"title":"Prueba de persistencia","description":"creado antes del down","published":false,
      "createdAt":"2026-08-28T21:44:49.013Z","updatedAt":"2026-08-28T21:44:49.013Z",
      "id":"6a9201513f578b4f049c9233"}]

El dato sigue estando, con el mismo `id` y la misma fecha de creación, aunque los contenedores se
destruyeron y se recrearon. El estado no vivía en el contenedor.

#### 3.3 `down -v`: los datos se borran

Comandos:

    docker compose down -v
    docker compose up -d
    curl http://localhost:8081/api/tutorials

Ahora sí aparece el volumen entre lo eliminado:

     Container ingsoft3-tp01-frontend-1  Removed
     Container ingsoft3-tp01-backend-1   Removed
     Container ingsoft3-tp01-db-1        Removed
     Volume ingsoft3-tp01_mongo_data     Removed        <-- la diferencia está acá
     Network ingsoft3-tp01_tienda_net    Removed

Resultado:

    []

La base arranca vacía. Comparando 3.2 con 3.3, la **única** diferencia entre conservar y perder los
datos es la línea del volumen: los contenedores se destruyen en los dos casos. Eso confirma que el
estado persistente vive exclusivamente en el volumen nombrado, que Docker administra aparte:

    docker volume ls

    local     ingsoft3-tp01_mongo_data

### 4. Comparación de tamaño: imagen de build vs imagen final

Comando:

    docker images

Resultado:

    ingsoft3-tp01-backend:latest    236MB
    ingsoft3-tp01-frontend:latest    77.9MB
    node:16-alpine                  170MB     <-- etapa de build del frontend
    node:20-alpine                  194MB     <-- etapa de build del backend

La imagen de build del frontend (`node:16-alpine`, 170 MB, con el compilador y todas las
devDependencies de React) **no viaja a producción**. La imagen final del frontend pesa 77,9 MB:
nginx más los estáticos compilados, **menos de la mitad** que su propia imagen de build. Esa
diferencia es la prueba concreta de para qué sirve el multi-stage.

El backend es el caso contrario y vale la pena explicarlo: pesa 236 MB, **más** que su imagen base
de 194 MB, porque una app de Node necesita el runtime de Node para ejecutarse — no hay binario
compilado que copiar. Lo que el multi-stage le ahorra ahí no es peso de runtime sino las
**dependencias de desarrollo**: la etapa final instala con `--omit=dev`.

### 5. Multi-stage confirmado en ambos Dockerfiles

Comando:

    grep -c "FROM" backend/Dockerfile frontend/Dockerfile

Resultado:

    backend/Dockerfile:2
    frontend/Dockerfile:2

Dos instrucciones `FROM` en cada uno: una etapa de build y una de runtime.

### 6. Usuario no root en el backend

Comando:

    grep -i "^USER" backend/Dockerfile

Resultado:

    USER node

El contenedor no corre como root. Si alguien logra ejecutar código dentro de él, lo hace con un
usuario sin privilegios.

### 7. Imágenes publicadas en ghcr.io, verificadas sin credenciales

Se consultó el manifiesto de cada imagen contra la API del registry usando un **token anónimo**
(el que ghcr.io entrega a cualquiera para repositorios públicos), sin usar mis credenciales:

    ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0   -> HTTP 200
      sha256:900da531e94c54f23fc80f27a92ce832e108ac0a6895f6e31f48734cdfbf2e07

    ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0  -> HTTP 200
      sha256:9445fc687d3304a6d8cef046b822e37522620e5980b91f4753b326cc40ac3778

Las dos responden `200` a un cliente sin autenticar, lo que confirma que su visibilidad es
**pública** — una imagen privada habría devuelto `401 unauthorized`.

Los nombres conservan el prefijo `tienda-tp2` porque así se publicaron en el TP2, antes de
consolidar el repositorio. El nombre de un paquete en ghcr.io es independiente del repositorio, y
renombrarlo rompería el `docker-compose.registry.yml` que ya está documentado.

### 8. Levantar el stack sin construir, desde el registry

Comando:

    docker compose -f docker-compose.registry.yml up -d

Este compose usa `image:` en vez de `build:`, así que el sistema se levanta **sin necesitar el
código fuente**: descarga las imágenes publicadas en lugar de construirlas. Es la prueba de para
qué sirvió publicarlas.

### 9. El `.env` está protegido

Comando:

    git check-ignore -v .env

Resultado:

    .gitignore:6:.env       .env

El archivo con las credenciales está excluido del control de versiones y no se puede subir por
accidente. Lo que sí se versiona es `.env.example`, con las claves vacías.
