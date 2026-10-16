// PRIMERO que todo, antes de express: el SDK envuelve los modulos cuando se
// cargan, asi que si express entra antes no hay nada que instrumentar.
const Sentry = require("./instrument");

const express = require("express");
const cors = require("cors");

const app = express();

// El front pide siempre al mismo origen (nginx hace de proxy), asi que CORS no
// hace falta para la app. Se deja abierto para poder pegarle a la API directo
// desde cualquier entorno al diagnosticar.
var corsOptions = {
  origin: process.env.CORS_ORIGIN || "*"
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});

// Liveness: dice que el proceso esta arriba. No toca la base a proposito:
// el smoke test pega ademas a /api/tutorials, que si la toca.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", commit: process.env.APP_COMMIT || "desconocido" });
});

require("./app/routes/turorial.routes")(app);

// Aca vivio /api/falla, el endpoint que lanzaba a proposito para ver un error
// llegar a Sentry (TP9 §3.5). Se saca al cerrar el practico, como corresponde:
// un endpoint que revienta no tiene nada que hacer en produccion.
//
// Sentry gratuito guarda 30 dias. Si para la defensa hiciera falta regenerar
// el error, vuelve por un PR con estas cuatro lineas y se saca despues:
//
//   app.get("/api/falla", (req, res) => {
//     throw new Error("Falla de prueba del TP9");
//   });

// Despues de TODAS las rutas y antes de cualquier otro middleware de error:
// captura lo que se escapa de un handler y lo manda a Sentry.
//
// Ojo con lo que NO ve: mis controllers atrapan sus propios errores y
// contestan 500 a mano, asi que nunca llegan hasta aca. Para que Sentry los
// viera habria que dejarlos propagar, o llamar a Sentry.captureException en
// cada catch. Es el primer arreglo si esto fuera en serio.
Sentry.setupExpressErrorHandler(app);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
// 0.0.0.0 y no localhost: adentro de un contenedor, localhost es el contenedor
// mismo, y nadie de afuera lo alcanza.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}.`);
});
