# --- Etapa 1: build de la app React ---
# react-scripts 4 trae un webpack incompatible con OpenSSL 3, la version que Node
# incluye desde la 17. Con Node 20 el build corta con ERR_OSSL_EVP_UNSUPPORTED,
# asi que se construye con Node 16 en vez de parchear NODE_OPTIONS.
FROM node:16-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json* yarn.lock* ./
RUN npm install

COPY . .

# Se hornea en el bundle al construir: apunta al proxy reverso de nginx,
# por eso tiene que quedar relativa.
ENV REACT_APP_API_URL=/api
RUN npm run build

# --- Etapa 2: tests (TP5) ---
# Parte de la etapa de build, que ya tiene Node y todas las dependencias
# (incluidas las de desarrollo, donde vive jest). CI=true evita que quede
# esperando en modo watch. Si la cobertura no llega al umbral, el build se corta.
FROM build AS test

ENV CI=true
RUN npm run test:coverage

# --- Etapa 3: solo el reporte, para poder sacarlo del build ---
FROM scratch AS coverage
COPY --from=test /usr/src/app/coverage /

# --- Etapa 4: nginx sirve los estaticos ---
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
