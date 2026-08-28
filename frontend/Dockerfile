# --- Stage 1: build the React app ---
# react-scripts 4 bundles a webpack version incompatible with the OpenSSL 3
# used by Node >=17, so build with Node 16 rather than patching NODE_OPTIONS.
FROM node:16-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json* yarn.lock* ./
RUN npm install

COPY . .

# Baked into the static bundle at build time: goes through the nginx
# reverse proxy configured in nginx.conf, so it must stay relative.
ENV REACT_APP_API_URL=/api
RUN npm run build

# --- Stage 2: serve the static build with nginx ---
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
