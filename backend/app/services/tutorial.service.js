// Caso de uso "crear tutorial", separado del controller de Express.
//
// El repositorio entra COMO PARÁMETRO (`repo`) en vez de requerirse acá adentro.
// Ése es el cambio que vuelve testeable esta función: en producción recibe el modelo
// de Mongoose, y en los tests recibe un doble, sin necesidad de una base corriendo.

const {
  validarTitulo,
  validarPublicacion,
  normalizarTutorial
} = require("../domain/tutorial.rules");

class ErrorDeValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorDeValidacion";
    this.status = 400;
  }
}

async function crearTutorial(repo, datos) {
  const errorTitulo = validarTitulo(datos && datos.title);
  if (errorTitulo) throw new ErrorDeValidacion(errorTitulo);

  const errorPublicacion = validarPublicacion(datos);
  if (errorPublicacion) throw new ErrorDeValidacion(errorPublicacion);

  return repo.create(normalizarTutorial(datos));
}

module.exports = { crearTutorial, ErrorDeValidacion };
