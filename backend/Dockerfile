# --- Stage 1: install dependencies ---
FROM node:20-alpine AS deps
# Usamos alpine para mantener la imagen ligera y reducir el tamaño del contenedor.

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# --- Stage 2: runtime image ---
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

USER node

# usamos USER node para que el contenedor no se ejecute como root,
# lo cual es una buena práctica de seguridad.  

EXPOSE 8080

CMD ["node", "server.js"]
