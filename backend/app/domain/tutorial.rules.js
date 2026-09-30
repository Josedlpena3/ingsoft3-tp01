// Reglas de negocio de un Tutorial.
// Funciones puras: no tocan la base ni la red, así que se pueden testear sin montar nada.

const TITULO_MIN = 3;
const TITULO_MAX = 100;

// Recorta los extremos y colapsa los espacios internos repetidos.
function normalizarTexto(texto) {
  if (typeof texto !== "string") return "";
  return texto.trim().replace(/\s+/g, " ");
}

// Regla 1 — el título es obligatorio y tiene que medir entre 3 y 100 caracteres.
// Devuelve el mensaje de error, o null si está bien.
function validarTitulo(titulo) {
  const limpio = normalizarTexto(titulo);
  if (limpio === "") return "El titulo es obligatorio";
  if (limpio.length < TITULO_MIN) return `El titulo debe tener al menos ${TITULO_MIN} caracteres`;
  if (limpio.length > TITULO_MAX) return `El titulo no puede superar los ${TITULO_MAX} caracteres`;
  return null;
}

// Regla 2 — normaliza la entrada antes de guardarla: sin espacios de más,
// descripción ausente como cadena vacía y published en false salvo que sea true explícito.
function normalizarTutorial(datos) {
  const entrada = datos || {};
  return {
    title: normalizarTexto(entrada.title),
    description: normalizarTexto(entrada.description),
    published: entrada.published === true
  };
}

// Regla 3 — no se puede publicar un tutorial sin descripción:
// lo que se publica lo lee alguien más, y un tutorial vacío no le sirve a nadie.
function validarPublicacion(datos) {
  const entrada = datos || {};
  if (entrada.published === true && normalizarTexto(entrada.description) === "") {
    return "No se puede publicar un tutorial sin descripcion";
  }
  return null;
}

// Regla 4 — escapa los metacaracteres antes de armar la expresión regular de búsqueda.
// Sin esto, buscar "(" hace que `new RegExp` lance y la API responda 500.
function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Arma el filtro de Mongo. Sin término de búsqueda devuelve {} (trae todo).
function construirFiltroBusqueda(titulo) {
  const limpio = normalizarTexto(titulo);
  if (limpio === "") return {};
  return { title: { $regex: new RegExp(escaparRegex(limpio)), $options: "i" } };
}

module.exports = {
  TITULO_MIN,
  TITULO_MAX,
  normalizarTexto,
  validarTitulo,
  normalizarTutorial,
  validarPublicacion,
  escaparRegex,
  construirFiltroBusqueda
};

// Regla 5 — resumen del estado de la coleccion, para el panel de la app.
// Cuenta publicados y pendientes, y calcula el porcentaje de avance.
function resumirColeccion(tutoriales) {
  if (!Array.isArray(tutoriales)) return { total: 0, publicados: 0, pendientes: 0, avance: 0 };
  const total = tutoriales.length;
  const publicados = tutoriales.filter(t => t && t.published === true).length;
  const pendientes = total - publicados;
  const avance = total === 0 ? 0 : Math.round((publicados / total) * 100);
  return { total, publicados, pendientes, avance };
}

// Regla 6 — etiqueta del avance para mostrar en el panel.
function etiquetaDeAvance(avance) {
  if (typeof avance !== "number" || Number.isNaN(avance)) return "sin datos";
  if (avance === 100) return "todo publicado";
  if (avance >= 50) return "mas de la mitad";
  if (avance > 0) return "recien empezando";
  return "nada publicado";
}

module.exports.resumirColeccion = resumirColeccion;
module.exports.etiquetaDeAvance = etiquetaDeAvance;
