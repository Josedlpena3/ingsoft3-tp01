# tienda-tp2

App tipo "Tutorials CRUD" (adaptada de bezkoder), containerizada para el TP2 de Ingenieria de Software 3.
Stack: React (frontend) + Node/Express (backend) + MongoDB, con Docker Compose.

## Requisitos
- Docker Desktop instalado y corriendo.

## Levantar el sistema desde cero
1. Clonar el repo y entrar a la carpeta:
   git clone https://github.com/Josedlpena3/tienda-tp2.git
   cd tienda-tp2
2. Copiar el archivo de variables de entorno:
   cp .env.example .env
   Luego editar .env y completar MONGO_ROOT_USERNAME y MONGO_ROOT_PASSWORD.
3. Levantar el stack:
   docker compose up -d --build
4. Verificar que los 3 servicios esten arriba:
   docker compose ps
5. Abrir en el navegador:
   http://localhost:8081

## Levantar usando las imagenes publicadas (sin buildear)
   cp .env.example .env
   docker compose -f docker-compose.registry.yml up -d

Imagenes publicadas:
- ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0
- ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0

## Verificar que todo funciona
   docker compose ps
   curl http://localhost:8081/api/tutorials

## Apagar el sistema
   docker compose down       (conserva los datos)
   docker compose down -v    (borra tambien los datos)

## Estructura del proyecto
tienda-tp2/
  backend/    -> API Node.js/Express + Mongoose (Dockerfile, .dockerignore)
  frontend/   -> SPA React (Dockerfile, nginx.conf, .dockerignore)
  docker-compose.yml            -> levanta el stack buildeando local
  docker-compose.registry.yml   -> levanta el stack bajando imagenes de ghcr.io
  .env.example
  decisiones.md
  evidencias.md

## Documentacion adicional
- decisiones.md: justificacion de la app elegida y decisiones tecnicas.
- evidencias.md: capturas y outputs que prueban el funcionamiento del sistema.
