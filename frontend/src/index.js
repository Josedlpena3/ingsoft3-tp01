import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";

import App from "./App";
import * as serviceWorker from "./serviceWorker";

// Antes de renderizar, para que un error durante el primer render tambien se
// capture.
//
// El DSN va escrito aca, y no es un descuido. El DSN de un front solo sirve
// para MANDAR datos a mi proyecto: no permite leerlos ni entrar a la cuenta.
// Y aunque lo escondiera, viajaria igual adentro del JavaScript que baja el
// navegador, asi que cualquiera que abra las DevTools lo ve. Es la diferencia
// con una clave de API, que si permite leer o modificar. Push protection no lo
// va a frenar, y esta bien que no lo frene.
Sentry.init({
  dsn: "https://cfe277d7bc8ffbfabf693982a9e52771@o4512267868307456.ingest.us.sentry.io/4512267901009921",

  // De que sitio vino el dato: localhost, el de QA o el de produccion. Lo
  // resuelve el navegador al cargar, asi que la MISMA imagen del front sirve
  // en los tres entornos y cada uno se identifica solo -- el mismo principio
  // que el BACKEND_URL del TP6.
  environment: window.location.hostname,

  // Mide cuanto tarda cada navegacion y cada pedido que sale del navegador.
  integrations: [Sentry.browserTracingIntegration()],

  tracesSampleRate: 1.0,
});

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById("root")
);

serviceWorker.unregister();
