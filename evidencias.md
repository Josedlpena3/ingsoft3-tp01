# Evidencias - TP2 Contenedores

## 1. Sistema funcionando end-to-end (docker-compose.registry.yml)

Comando:
    docker compose -f docker-compose.registry.yml ps

Resultado:
    NAME                    IMAGE                                            SERVICE    STATUS
    tienda-tp2-backend-1    ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0    backend    Up
    tienda-tp2-db-1         mongo:7                                          db         Up (healthy)
    tienda-tp2-frontend-1   ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0   frontend   Up

Los tres servicios levantan correctamente usando las imagenes descargadas del registry (no
build local), y la base de datos pasa el healthcheck.

## 2. Prueba de persistencia

### 2.1 Creacion de un dato de prueba

Comando:
    curl -X POST http://localhost:8081/api/tutorials \
      -H "Content-Type: application/json" \
      -d '{"title":"Test persistencia","description":"probando volumen"}'

Resultado:
    {"title":"Test persistencia","description":"probando volumen","published":false,
     "createdAt":"2026-08-27T12:03:54.976Z","updatedAt":"2026-08-27T12:03:54.976Z",
     "id":"6a9027aabd49c6cda99750b6"}

### 2.2 down / up SIN -v (los datos deben sobrevivir)

Comando:
    docker compose down
    docker compose up -d
    curl http://localhost:8081/api/tutorials

Resultado:
    [{"title":"Test persistencia","description":"probando volumen","published":false,
      "createdAt":"2026-08-27T12:03:54.976Z","updatedAt":"2026-08-27T12:03:54.976Z",
      "id":"6a9027aabd49c6cda99750b6"}]

El tutorial de prueba SIGUE apareciendo despues de bajar y levantar el stack: el volumen
nombrado (mongo_data) persistio los datos aunque los contenedores se recrearon.

### 2.3 down -v (los datos deben borrarse)

Comando:
    docker compose -f docker-compose.registry.yml down -v
    docker compose -f docker-compose.registry.yml up -d
    curl http://localhost:8081/api/tutorials

Resultado:
    []

Con el flag -v el volumen se elimina junto con los contenedores, y al recrear el stack la base
arranca vacia. Confirma que el estado persistente vive exclusivamente en el volumen, no en los
contenedores.

## 3. Comparacion de tamano: imagen de build vs imagen final (multi-stage)

Comando:
    docker images | grep -E "node|tienda-tp2-backend|tienda-tp2-frontend"

Resultado:
    tienda-tp2-frontend                       latest   77.9MB
    ghcr.io/josedlpena3/tienda-tp2-frontend   v0.1.0   77.9MB
    tienda-tp2-backend                        latest   236MB
    ghcr.io/josedlpena3/tienda-tp2-backend    v0.1.0   236MB
    node                                      20-alpine   194MB
    node                                      16-alpine   170MB

La imagen de build del frontend (node:16-alpine, 170MB, con el compilador y todas las
devDependencies de React) no viaja a produccion. La imagen final del frontend
(tienda-tp2-frontend, 77.9MB, nginx + solo los estaticos compilados) pesa menos de la mitad
que la imagen de build. Esta diferencia es la prueba concreta de que el multi-stage build
reduce el tamano final de la imagen.

## 4. Multi-stage confirmado en ambos Dockerfiles

Comando:
    grep -c "FROM" backend/Dockerfile frontend/Dockerfile

Resultado:
    backend/Dockerfile:2
    frontend/Dockerfile:2

Ambos Dockerfiles tienen al menos dos instrucciones FROM, confirmando la estructura multi-stage
(una etapa de build, una etapa de runtime).

## 5. Usuario no root en el backend

Comando:
    grep -i "USER" backend/Dockerfile

Resultado:
    USER node

## 6. Imagenes publicadas en ghcr.io (verificado con pull sin credenciales)

Comando:
    docker logout ghcr.io
    docker pull ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0
    docker pull ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0

Resultado:
    v0.1.0: Pulling from josedlpena3/tienda-tp2-backend
    Digest: sha256:900da531e94c54f23fc80f27a92ce832e108ac0a6895f6e31f48734cdfbf2e07
    Status: Image is up to date for ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0

    v0.1.0: Pulling from josedlpena3/tienda-tp2-frontend
    Digest: sha256:9445fc687d3304a6d8cef046b822e37522620e5980b91f4753b326cc40ac3778
    Status: Image is up to date for ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0

Ambas imagenes se descargan correctamente estando deslogueado de ghcr.io, lo que confirma que
su visibilidad es publica (una imagen privada hubiese devuelto "unauthorized").

Paquetes visibles en GitHub Packages (https://github.com/Josedlpena3?tab=packages):
- tienda-tp2-backend (Public)
- tienda-tp2-frontend (Public)

## 7. .env protegido correctamente

Comando:
    git check-ignore -v .env

Resultado:
    .gitignore:2:.env       .env

Confirma que .env esta excluido del control de versiones y no puede subirse por accidente.
