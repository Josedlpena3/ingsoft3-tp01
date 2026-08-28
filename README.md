# ingsoft3-tp01 — Repo del semestre · Ingeniería de Software 3 (UCC 2026)

Repositorio único de la cursada: arrancó como el TP1 (Git colaborativo) y desde el TP2 aloja
además **la app del semestre**. Cada TP agrega una capa sobre el mismo artefacto.

| TP | Qué agregó | Tag |
|---|---|---|
| TP1 | Git colaborativo: `main` protegida, PRs, conflicto resuelto | `v1.0.0` |
| TP2 | App contenerizada: Dockerfiles multi-stage, Compose, imágenes en ghcr | `v2.0.0` |
| TP3 | Planificación: épica/historia/tareas, sprint, board y trazabilidad | `v3.0.0` |
| TP4 | CI as code: build de las dos imágenes, cache de capas y gate del PR | `v4.0.0` |

Documentación: [`decisiones.md`](decisiones.md) · [`evidencias.md`](evidencias.md)

## La app

CRUD de "Tutorials" (adaptado de bezkoder), partido en tres servicios:

- **frontend** — React (hooks + axios), servido por nginx, que además hace de proxy reverso hacia el backend
- **backend** — Node.js / Express / Mongoose
- **db** — MongoDB 7, con los datos en un volumen nombrado

## Requisitos

- Docker Desktop instalado y **corriendo**.

## Levantar el sistema desde cero

```bash
git clone https://github.com/Josedlpena3/ingsoft3-tp01.git
cd ingsoft3-tp01
cp .env.example .env          # y completar MONGO_ROOT_USERNAME y MONGO_ROOT_PASSWORD
docker compose up -d --build
```

El `.env` no se versiona, así que al clonar **no está**: si te salteás el `cp`, Compose reemplaza
las variables faltantes por vacío y Mongo se niega a arrancar. Es el primer paso, no el último.

Verificar que los tres servicios estén arriba y que la API responda:

```bash
docker compose ps
curl http://localhost:8081/api/tutorials
```

Y abrir <http://localhost:8081> en el navegador.

## Levantar usando las imágenes publicadas (sin buildear)

```bash
cp .env.example .env
docker compose -f docker-compose.registry.yml up -d
```

Imágenes publicadas (públicas):

- `ghcr.io/josedlpena3/tienda-tp2-backend:v0.1.0`
- `ghcr.io/josedlpena3/tienda-tp2-frontend:v0.1.0`

## Apagar

```bash
docker compose down      # conserva los datos (el volumen sobrevive)
docker compose down -v   # borra también el volumen, y con él los datos
```

## Estructura

```
.
├── .github/workflows/ci.yml        # pipeline de CI (TP3 lo creó, TP4 lo completó)
├── backend/                        # API Node/Express + Mongoose (Dockerfile, .dockerignore)
├── frontend/                       # SPA React (Dockerfile, nginx.conf, .dockerignore)
├── docker-compose.yml              # levanta el stack buildeando local
├── docker-compose.registry.yml     # levanta el stack bajando las imágenes de ghcr.io
├── .env.example
├── img/                            # capturas de evidencias.md
├── decisiones.md
└── evidencias.md
```
