# --- Etapa 1: dependencias de produccion ---
FROM node:20-alpine AS deps
# Alpine para mantener la imagen final liviana.

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# --- Etapa 2: tests (TP5) ---
# Instala TODAS las dependencias, tambien las de desarrollo: sin jest no hay tests.
# Si la cobertura no llega al umbral de package.json, este RUN devuelve != 0
# y el build de la imagen se corta aca.
FROM node:20-alpine AS test

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run test:coverage

# --- Etapa 3: solo el reporte, para poder sacarlo del build ---
# `scratch` esta vacia a proposito: al exportar esta etapa sale unicamente
# la carpeta coverage, sin el resto del sistema de archivos.
FROM scratch AS coverage
COPY --from=test /usr/src/app/coverage /

# --- Etapa 4: runtime ---
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Usuario sin privilegios: si alguien logra ejecutar algo adentro, lo hace atado.
USER node

EXPOSE 8080

CMD ["node", "server.js"]
