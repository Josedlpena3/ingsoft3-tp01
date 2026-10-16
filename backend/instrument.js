// Sentry, y tiene que cargarse ANTES que cualquier otra cosa.
//
// El SDK v8 instrumenta Express envolviendo sus modulos cuando se cargan: si
// `require("express")` pasa primero, no hay nada que envolver y los tiempos de
// cada endpoint no se miden. Por eso server.js arranca con un require a este
// archivo, antes de los suyos.
//
// El DSN NO esta escrito aca: entra por variable de entorno, y solo el compose
// de produccion la define. Eso tiene una consecuencia buscada: en mi maquina,
// en los tests y en QA la variable no existe, el SDK queda apagado solo, y la
// aplicacion anda igual. Produccion es el unico entorno que manda datos.

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // De que entorno vino cada dato. Sin esto, en Sentry se mezclaria todo.
  environment: process.env.SENTRY_ENV || "desconocido",

  // El commit que esta corriendo, el mismo que devuelve /health. Permite
  // preguntarle a Sentry "¿este error aparecio recien o ya estaba?".
  release: process.env.APP_COMMIT,

  // 1.0 = se mide el 100% de los pedidos. En una app con trafico de verdad
  // esto se baja, porque cada medicion se cobra; para una app de cursada el
  // plan gratis da 5 millones por mes y sobra.
  tracesSampleRate: 1.0,
});

module.exports = Sentry;
