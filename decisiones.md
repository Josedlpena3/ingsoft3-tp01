# Decisiones - TP2 Contenedores

## 1. Eleccion de la app del semestre

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

## 2. Decisiones tecnicas de containerizacion

### Backend (multi-stage)
- Imagen base: node:20-alpine, tanto en la etapa de build como en la de runtime.
- Se instalan solo dependencias de produccion en la imagen final (--omit=dev).
- El contenedor corre con usuario no root (USER node), no como root por defecto.
- La conexion a MongoDB se lee de la variable de entorno MONGO_URL (antes estaba hardcodeada
  a mongodb://0.0.0.0:27017/bezkoder_db, lo cual no funciona en contenedores separados).

### Frontend (multi-stage)
- Etapa de build: node:16-alpine (en vez de node:20-alpine).
  Motivo: el proyecto usa react-scripts con Webpack 4 (version vieja), que no es compatible
  con OpenSSL 3, la version que trae Node desde la 17 en adelante. Al buildear con Node 20
  aparece el error "error:0308010C:digital envelope routines::unsupported". Usar Node 16 evita
  el problema sin tener que tocar el codigo del proyecto ni sus dependencias.
- Etapa final: nginx:1.27-alpine, sirviendo los archivos estaticos generados por el build.

### Proxy reverso de nginx
El frontend (React) corre en el navegador del usuario, fuera de la red interna de Docker. Por
eso no puede pedirle nada directamente a "http://backend:8080" (ese nombre solo resuelve DENTRO
de la red de contenedores). La solucion: el frontend llama a rutas relativas ("/api/..."), y
nginx -que si corre dentro del contenedor y de la red interna- redirige esas rutas al servicio
backend por su nombre de servicio (backend:8080), usando el DNS interno de Docker
(resolver 127.0.0.11). El proxy_pass se escribe sin barra final para no romper el path
("/api/tutorials" no se convierte en "/tutorials").

Con este patron, ademas, no hace falta configurar CORS: para el navegador todo sale del mismo
origen (el propio nginx).

### Persistencia
Los datos de MongoDB se guardan en un volumen nombrado (mongo_data), no en el filesystem del
contenedor. Esto es necesario porque los contenedores son efimeros: si se borra el contenedor
de Mongo, su capa de escritura se pierde, pero el volumen sobrevive porque Docker lo administra
aparte. Se verifico esto de forma practica: se creo un dato de prueba, se hizo
"docker compose down" + "up" y el dato seguia estando; despues se hizo "down -v" y el dato
desaparecio (el volumen se borro).

### depends_on + healthcheck
"depends_on" solo garantiza que el contenedor de Mongo haya ARRANCADO, no que este LISTO para
aceptar conexiones. Por eso se agrego un healthcheck ("mongosh --eval db.adminCommand('ping')")
y se uso "depends_on: condition: service_healthy" en el backend, para que espere a que Mongo
este realmente disponible antes de intentar conectarse.

## 3. Problemas encontrados y como se resolvieron

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

## 4. Declaracion de uso de IA

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
