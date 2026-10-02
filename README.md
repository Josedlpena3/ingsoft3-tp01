# ingsoft3-tp01 — Repo del semestre · Ingeniería de Software 3 (UCC 2026)

[![CI](https://github.com/Josedlpena3/ingsoft3-tp01/actions/workflows/ci.yml/badge.svg)](https://github.com/Josedlpena3/ingsoft3-tp01/actions/workflows/ci.yml)

Repositorio único de la cursada: arrancó como el TP1 (Git colaborativo) y desde el TP2 aloja
además **la app del semestre**. Cada TP agrega una capa sobre el mismo artefacto.

| TP | Qué agregó | Tag |
|---|---|---|
| TP1 | Git colaborativo: `main` protegida, PRs, conflicto resuelto | `v1.0.0` |
| TP2 | App contenerizada: Dockerfiles multi-stage, Compose, imágenes en ghcr | `v2.0.0` |
| TP3 | Planificación: épica/historia/tareas, sprint, board y trazabilidad | `v3.0.0` |
| TP4 | CI as code: build de las dos imágenes, cache de capas y gate del PR | `v4.0.0` |

Documentación: [`decisiones.md`](decisiones.md) · [`evidencias.md`](evidencias.md)

## Entornos

El pipeline despliega solo: al entrar un cambio a `main` publica las imágenes en
ghcr.io etiquetadas con el commit, las despliega en QA, y espera aprobación humana
antes de tocar producción.

| | QA | PROD |
|---|---|---|
| Front | <http://localhost:3000> | <http://localhost:3001> |
| API | <http://localhost:8080> | <http://localhost:8081> |
| Promoción | automática al mergear | con aprobación manual |
| Base | volumen `mongo_data_qa` | volumen `mongo_data_prod` |

Los dos corren **la misma imagen**: la dirección del backend no está adentro, se lee
de `BACKEND_URL` al arrancar. `GET /health` de cada API devuelve el commit que está
corriendo, así se sabe qué versión hay en cada entorno.

Los despliegues los ejecuta un runner self-hosted. Para levantarlo:

```bash
cd ~/actions-runner && ./run.sh
```


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

## Pruebas

Tres capas, y cada una ve algo que las otras no:

| Capa | Dónde vive | Contra qué corre | Tarda |
|---|---|---|---|
| Unitarias | `backend/app/**/*.test.js` · `frontend/src/lib/*.test.js` | la unidad sola, con dobles | milisegundos |
| Integración | `frontend/e2e/api.spec.js` | la **api de QA** desplegada, con su Mongo de verdad | segundos |
| e2e | `frontend/e2e/tutoriales.spec.js` | el **front de QA**, con un navegador real | minutos |

Las unitarias corren adentro de la etapa `test` del Dockerfile, en el pipeline. Las otras dos corren
contra el entorno ya desplegado, así que primero tiene que estar arriba.

```bash
cd frontend
npm ci
npx playwright install chromium

API_BASE_URL=http://localhost:8080 npm run test:integracion
E2E_BASE_URL=http://localhost:3000 npm run test:e2e

npx playwright show-report        # el reporte de la última corrida
```

`API_BASE_URL` es la **api**; `E2E_BASE_URL` es el **front**. Son dos servicios con dos direcciones:
si le pasás la del front a la integración, los pedidos dan 404.

En el pipeline las dos se encadenan como gate: `deploy-qa → integracion → e2e → deploy-prod`. Si
cualquiera de las dos se pone roja, producción ni llega a pedir aprobación.

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
