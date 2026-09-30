// Lógica de presentación de los tutoriales, separada de los componentes.
// Son funciones puras (salvo buscarTutoriales, que recibe el servicio por parámetro),
// así que se testean sin montar React ni tocar el DOM.

export const LARGO_RESUMEN = 40;

// Texto legible del estado. Los componentes no deciden el idioma ni el criterio.
export function estadoLegible(tutorial) {
  return tutorial && tutorial.published === true ? "Publicado" : "Pendiente";
}

// Acorta la descripción para la lista, cortando en palabra y agregando puntos suspensivos.
export function resumirDescripcion(texto, largo = LARGO_RESUMEN) {
  if (typeof texto !== "string") return "";
  const limpio = texto.trim();
  if (limpio.length <= largo) return limpio;
  return limpio.slice(0, largo).trimEnd() + "...";
}

// Filtro en memoria, sin distinguir mayúsculas ni espacios de más.
export function filtrarPorTitulo(lista, termino) {
  if (!Array.isArray(lista)) return [];
  const buscado = String(termino || "").trim().toLowerCase();
  if (buscado === "") return lista;
  return lista.filter(t => String(t.title || "").toLowerCase().includes(buscado));
}

// El servicio entra COMO PARÁMETRO: en la app va TutorialService, en los tests un doble.
// Si la API falla, devuelve una lista vacía en vez de dejar explotar al componente.
export async function buscarTutoriales(service, titulo) {
  try {
    const respuesta = await service.findByTitle(titulo);
    return Array.isArray(respuesta && respuesta.data) ? respuesta.data : [];
  } catch (error) {
    return [];
  }
}
