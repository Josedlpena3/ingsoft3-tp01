# Decisiones

Documento acumulativo de la cursada: cada TP agrega su sección al final, sin pisar las anteriores.

---

## TP1 — Git colaborativo

### 1. Por qué Git no pudo resolver el conflicto solo

Cuando armé las ramas A y B, las dos salieron del mismo commit de main.
las dos cambiaban la misma primera línea del README, cada una con un texto distinto. Git no sabe cuál de las dos versiones quiero que quede, así que me pregunta que decision quiero tomar.

Cuando abrí el editor de conflictos me encontré con los marcadores `<<<<<<<`, `=======` y `>>>>>>>` y no sabia que hacer, así que le pregunté a la IA que tenia que hacer. Me explicó que arriba de las `=======` está mi versión y abajo la que ya estaba en
main, y que hay que borrar las tres líneas de marcadores a mano y dejar solo el contenido final.

Para que el conflicto nunca hubiera aparecido, tendría que haber creado la rama B recién después de mergear la A, o directamente no tocar la misma línea en las dos.

### 2. Problemas que encontré y cómo los solucioné
- Al proteger `main` dejé sin querer tildado "Require approvals" en 1, y como soy el único colaborador nunca podía aprobar mi propio PR. Lo destildé en Settings → Branches.
- Creé las ramas del conflicto pero me olvidé de terminar de abrir los PRs. Los abrí después con "Compare & pull request".

### 3. Declaración de uso de IA

Usé Claude como guía en el TP cuando no sabia hacer algo, especialmente cuando abrí el editor de conflictos.

### 4. Corrección posterior: el tag `v1.0.0` se movió

Al consolidar el repo del semestre detecté dos cosas del TP1 que habían quedado mal cerradas:

- `evidencias.md` había entrado a `main` en el PR #4 **vacío** (0 bytes). Las cuatro capturas
  estaban en `img/`, pero el archivo que las referencia no tenía contenido: el texto se me quedó
  en el working tree sin commitear. Se corrigió por PR aparte.
- El tag `v1.0.0` apuntaba a un commit **anterior** a `decisiones.md` y `evidencias.md`, así que
  congelaba un estado incompleto del TP1.

Como el reglamento (§3) contempla explícitamente mover un tag ya publicado, se movió con
`git tag -f v1.0.0 && git push -f origin v1.0.0` al commit donde el TP1 quedó realmente cerrado.
Se documenta acá porque un tag movido sin avisar es exactamente el tipo de cosa que rompe la
confianza en una release.

---

## TP2 — Contenedores

### 1. Eleccion de la app del semestre

Se eligio armar un stack propio combinando dos repos tutorial de bezkoder:
- Backend: node-express-mongodb (Node.js + Express + Mongoose)
- Frontend: react-hooks-crud-web-api (React con Hooks, sin Redux, Axios)

Motivos, segun los criterios de la guia:
- Buildea y corre local sin complicaciones: se probo ANTES de comprometerse con esta opcion.
- Backend y frontend estan separados en servicios distintos (requisito del TP), a diferencia
  de una alternativa que se descarto antes (una app propia en Next.js, que al ser SSR mezcla
  back y front en un mismo proceso y no permite el patron de Dockerfiles separados + proxy nginx).
- Tamano acotado: es un CRUD simple (Tutorials: titulo, descripcion, publicado), sin pantallas
  ni features de mas. Alcanza para practicar Docker sin sumar friccion innecesaria.
- Se entiende el codigo lo suficiente como para modificarlo (se modificaron config de conexion
  a la base y la URL de la API para adaptarlo a contenedores).

### 2. Decisiones tecnicas de containerizacion

#### Backend (multi-stage)
- Imagen base: node:20-alpine, tanto en la etapa de build como en la de runtime.
- Se instalan solo dependencias de produccion en la imagen final (--omit=dev).
- El contenedor corre con usuario no root (USER node), no como root por defecto.
- La conexion a MongoDB se lee de la variable de entorno MONGO_URL (antes estaba hardcodeada
  a mongodb://0.0.0.0:27017/bezkoder_db, lo cual no funciona en contenedores separados).

#### Frontend (multi-stage)
- Etapa de build: node:16-alpine (en vez de node:20-alpine).
  Motivo: el proyecto usa react-scripts con Webpack 4 (version vieja), que no es compatible
  con OpenSSL 3, la version que trae Node desde la 17 en adelante. Al buildear con Node 20
  aparece el error "error:0308010C:digital envelope routines::unsupported". Usar Node 16 evita
  el problema sin tener que tocar el codigo del proyecto ni sus dependencias.
- Etapa final: nginx:1.27-alpine, sirviendo los archivos estaticos generados por el build.

#### Proxy reverso de nginx
El frontend (React) corre en el navegador del usuario, fuera de la red interna de Docker. Por
eso no puede pedirle nada directamente a "http://backend:8080" (ese nombre solo resuelve DENTRO
de la red de contenedores). La solucion: el frontend llama a rutas relativas ("/api/..."), y
nginx -que si corre dentro del contenedor y de la red interna- redirige esas rutas al servicio
backend por su nombre de servicio (backend:8080), usando el DNS interno de Docker
(resolver 127.0.0.11). El proxy_pass se escribe sin barra final para no romper el path
("/api/tutorials" no se convierte en "/tutorials").

Con este patron, ademas, no hace falta configurar CORS: para el navegador todo sale del mismo
origen (el propio nginx).

#### Persistencia
Los datos de MongoDB se guardan en un volumen nombrado (mongo_data), no en el filesystem del
contenedor. Esto es necesario porque los contenedores son efimeros: si se borra el contenedor
de Mongo, su capa de escritura se pierde, pero el volumen sobrevive porque Docker lo administra
aparte. Se verifico esto de forma practica: se creo un dato de prueba, se hizo
"docker compose down" + "up" y el dato seguia estando; despues se hizo "down -v" y el dato
desaparecio (el volumen se borro).

#### depends_on + healthcheck
"depends_on" solo garantiza que el contenedor de Mongo haya ARRANCADO, no que este LISTO para
aceptar conexiones. Por eso se agrego un healthcheck ("mongosh --eval db.adminCommand('ping')")
y se uso "depends_on: condition: service_healthy" en el backend, para que espere a que Mongo
este realmente disponible antes de intentar conectarse.

### 3. Problemas encontrados y como se resolvieron

- Error "digital envelope routines::unsupported" al correr el frontend con Node 20: se resolvio
  usando Node 16 en la etapa de build (ver arriba).
- Error "ECONNREFUSED" del backend al arrancar: Docker Desktop no estaba corriendo (estaba
  instalado pero no abierto). Se resolvio abriendo la aplicacion manualmente antes de correr
  comandos docker.
- Conexion a MongoDB hardcodeada a localhost: no funciona en contenedores separados porque cada
  uno tiene su propio localhost. Se resolvio externalizando la URL a la variable de entorno
  MONGO_URL, con un fallback para poder seguir corriendo local sin Docker.
- Imagenes publicadas en ghcr.io nacen privadas por defecto: se cambio la visibilidad a Public
  manualmente desde Package Settings > Danger Zone > Change visibility, y se confirmo con un
  "docker pull" sin estar logueado.

### 4. Declaracion de uso de IA

Se uso IA (Claude, via chat, y la IA integrada del editor) durante el desarrollo del TP, de la
siguiente manera:

- Explicaciones conceptuales y troubleshooting paso a paso (errores de Docker Desktop, error de
  OpenSSL, ECONNREFUSED de Mongo) se resolvieron con ayuda de Claude, verificando cada paso con
  el resultado real de los comandos antes de avanzar al siguiente.
- Los archivos de containerizacion (backend/Dockerfile, frontend/Dockerfile, frontend/nginx.conf,
  docker-compose.yml, .env.example, .gitignore) fueron generados por la IA integrada del editor,
  a partir de un prompt detallado con los requisitos tecnicos del TP (multi-stage, healthcheck,
  volumen nombrado, proxy reverso, no root, etc).
- Verificacion: cada archivo generado se reviso manualmente contra la guia del TP (multi-stage
  confirmado con "grep FROM", usuario no root confirmado con "grep USER", persistencia probada
  con down/up y down -v, conexion a la base verificada en los logs del backend). El
  docker-compose.registry.yml se probo levantando el stack desde las imagenes publicadas en
  ghcr.io (no desde build local), confirmando que descarga en vez de construir.
- No se modifico la logica de negocio de la app (controllers, models, rutas, componentes React)
  mas alla de los dos cambios estrictamente necesarios para adaptarla a contenedores: la lectura
  de MONGO_URL por variable de entorno en el backend, y el uso de REACT_APP_API_URL en el
  frontend.

### 5. Consolidación en un solo repositorio

El TP2 se desarrolló al principio en un repositorio aparte (`tienda-tp2`). El reglamento de la
materia (§3) pide **un solo repo para todo el semestre**, con la app entrando al repo del TP1 —el
de las protecciones—, porque los TPs no son entregables sueltos sino capas sobre el mismo
artefacto: el pipeline del TP4 corre sobre estos mismos Dockerfiles.

La unificación se hizo **mergeando el historial**, no copiando archivos:

    git remote add tp2 /ruta/local/a/tienda-tp2   # el clon local, no el remoto: ver más abajo
    git fetch tp2
    git merge --allow-unrelated-histories tp2/main

`--allow-unrelated-histories` hace falta porque los dos repos nacieron por separado y no comparten
ningún commit raíz; sin ese flag git se niega a mergear. La ventaja de hacerlo así en vez de copiar
los archivos es que los commits del TP2 quedan en el historial del repo del semestre con su fecha
real. Ese PR se mergeó con **merge commit** en vez de squash justamente por eso: el squash los
habría aplastado en uno solo y habría perdido lo que queríamos conservar.

El merge trajo conflictos en los cuatro archivos que existían en ambos repos (`README.md`,
`.gitignore`, `decisiones.md`, `evidencias.md`), resueltos combinando ambas versiones en vez de
elegir una.

#### El commit del TP2 que nunca había llegado a GitHub

Al hacer el `git fetch` desde `https://github.com/Josedlpena3/tienda-tp2.git` aparecieron **dos**
commits, no tres: faltaba `d6563fd`, el de la documentación. Comparando `main` local contra
`origin/main` en aquel repo se confirmó que ese commit **nunca se había pusheado**, y con él nunca
llegaron a GitHub cuatro entregables del TP2: `README.md`, `decisiones.md`, `evidencias.md` y
`docker-compose.registry.yml`. Existían sólo en mi disco, así que quien hubiera abierto el
repositorio no habría visto ninguno.

Cómo se detectó, y por qué es fácil que pase: `git status` decía "working tree clean" —porque el
commit **sí** estaba hecho— y nada en la terminal avisa de que falta el push. La diferencia sólo
se ve comparando contra el remoto:

    git log --oneline origin/main..main     # commits locales que el remoto no tiene

Se resolvió mergeando desde el **clon local** (`git remote set-url tp2 <ruta local>`), que sí tiene
el historial completo, en vez de desde el remoto incompleto. El commit entra así al repo del
semestre con su fecha y su autoría originales. La lección que me llevo es que "commiteado" y
"entregado" no son lo mismo, y que la única verificación que vale es abrir el repositorio en el
navegador — es la misma idea que el TP3 aplica al Project (probarlo en una ventana de incógnito).
