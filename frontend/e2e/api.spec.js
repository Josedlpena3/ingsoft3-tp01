// Suite de INTEGRACION — el escalon del medio.
//
// Le habla directo a la api de QA que el pipeline acaba de desplegar, con su
// MongoDB de verdad detras. Sin navegador y sin ningun doble en el medio: los
// unitarios del TP5 le pusieron un doble al repositorio para probar las reglas
// aisladas; aca se lo saco, para probar que el codigo y la base se entienden.
//
// Lo que ve esta suite y no puede ver un unitario: lo que la base acepta,
// rechaza y devuelve de verdad. Un doble contesta lo que yo le dije que
// conteste; Mongo contesta lo que pasa.

const { test, expect } = require("@playwright/test");

// La api, NO el front: son dos servicios con dos direcciones. Sin barra final.
const API = process.env.API_BASE_URL || "http://localhost:8080";

// Pide la lista y la devuelve ya convertida.
async function listar(request) {
  const r = await request.get(`${API}/api/tutorials`);
  expect(r.status()).toBe(200);
  return await r.json();
}

// Cada dato lleva la hora adentro: QA es uno solo y lo comparten todas las
// corridas, asi que dos corridas no pueden pelearse por el mismo titulo.
function tituloUnico(etiqueta) {
  return `api ${etiqueta} ${Date.now()}`;
}

test("el alta guarda en la base de verdad, y el borrado la saca", async ({ request }) => {
  const title = tituloUnico("alta");

  const alta = await request.post(`${API}/api/tutorials`, {
    data: { title, description: "creado por la suite de integracion" }
  });
  // 200, no 201: el controller contesta con res.send(data). Es el contrato que
  // tiene esta api, y la prueba afirma sobre el contrato que existe.
  expect(alta.status()).toBe(200);

  const creado = await alta.json();
  expect(creado.id).toBeTruthy();
  // published no viaja en el pedido: lo pone la regla de normalizacion del TP5,
  // y aca se comprueba que ademas llego asi a la base.
  expect(creado.published).toBe(false);

  // El GET le pregunta a Mongo, no a un doble: si el documento no se hubiera
  // guardado, aca no estaria.
  const lista = await listar(request);
  expect(lista.some(t => t.title === title)).toBe(true);

  const borrado = await request.delete(`${API}/api/tutorials/${creado.id}`);
  expect(borrado.status()).toBe(200);

  const despues = await listar(request);
  expect(despues.some(t => t.title === title)).toBe(false);
});

test("un titulo vacio lo rechaza la api, y no crea nada", async ({ request }) => {
  const alta = await request.post(`${API}/api/tutorials`, {
    data: { title: "", description: "no deberia guardarse" }
  });

  expect(alta.status()).toBe(400);
  const cuerpo = await alta.json();
  expect(cuerpo.message).toContain("obligatorio");

  // "No se creo nada", comprobado sobre la base: no queda ningun tutorial con
  // el titulo vacio. Se afirma esto y no "la lista mide lo mismo que antes"
  // porque esa comparacion se pone roja sola si otra corrida crea un dato en el
  // medio — seria un test flaky fabricado por mi.
  const despues = await listar(request);
  const sinTitulo = despues.filter(t => !t.title || t.title.trim() === "");
  expect(sinTitulo).toHaveLength(0);
});

test("buscar un titulo con parentesis devuelve el dato, no un error 500", async ({ request }) => {
  // Mi tercera prueba. El buscador es lo que el usuario toca todos los dias, y
  // este titulo tiene un parentesis sin cerrar: el filtro de Mongo se arma con
  // una expresion regular, y antes del TP5 el texto del usuario entraba crudo a
  // new RegExp(). Un "(" suelto la hacia lanzar y la api contestaba 500: la
  // busqueda entera se caia por un caracter.
  //
  // El unitario del TP5 ya afirma que escaparRegex devuelve la cadena escapada.
  // Esta prueba afirma lo que aquel no puede: que Mongo acepta ese filtro y
  // devuelve el documento. Una cosa es escribir bien la expresion; otra es que
  // el motor que la ejecuta este de acuerdo.
  const title = `${tituloUnico("regex")} (sin cerrar`;

  const alta = await request.post(`${API}/api/tutorials`, {
    data: { title, description: "titulo con metacaracteres" }
  });
  expect(alta.status()).toBe(200);
  const creado = await alta.json();

  const busqueda = await request.get(`${API}/api/tutorials`, { params: { title } });
  expect(busqueda.status()).toBe(200);

  const encontrados = await busqueda.json();
  expect(encontrados.some(t => t.title === title)).toBe(true);

  const borrado = await request.delete(`${API}/api/tutorials/${creado.id}`);
  expect(borrado.status()).toBe(200);

  const despues = await listar(request);
  expect(despues.some(t => t.title === title)).toBe(false);
});
