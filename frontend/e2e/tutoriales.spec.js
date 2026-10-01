// Suite E2E — la punta de la piramide.
//
// Un navegador de verdad usando el front de QA como lo usa una persona: llena
// el formulario, clickea, lee lo que aparece en pantalla. No sabe nada de la
// api: le pega a traves del front, igual que un usuario.
//
// Nada de mocks ni de interceptar pedidos: si el navegador no le pega a mi api
// de verdad, esto no es end-to-end.

const { test, expect } = require("@playwright/test");

// Cada flujo se fabrica un titulo con la hora adentro: QA es uno solo y lo
// comparten todas las corridas.
function tituloUnico(etiqueta) {
  return `e2e ${etiqueta} ${Date.now()}`;
}

// El alta, como la hace una persona: el formulario de /add.
async function crearDesdeLaPantalla(page, title, description) {
  await page.goto("/add");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Submit" }).click();
}

test("crear un tutorial lo muestra en la lista, y borrarlo lo saca", async ({ page }) => {
  const title = tituloUnico("alta");

  await crearDesdeLaPantalla(page, title, "creado por la suite e2e");
  await expect(page.getByText("You submitted successfully!")).toBeVisible();

  // La lista se arma con lo que la api devuelve: si el alta no hubiera llegado
  // a la base, aca no estaria.
  await page.goto("/tutorials");
  await expect(page.getByText(title)).toBeVisible();

  // Limpia lo que creo, desde la pantalla, y lo comprueba.
  await page.getByRole("button", { name: `Borrar ${title}` }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("un titulo demasiado largo muestra el error y no crea nada", async ({ page }) => {
  // El maximo del backend son 100 caracteres: este lo pasa.
  const title = `${tituloUnico("largo")} ${"x".repeat(100)}`;

  await crearDesdeLaPantalla(page, title, "no deberia guardarse");

  // El usuario ve el error, con el texto que escribio la regla del backend.
  const alerta = page.getByRole("alert");
  await expect(alerta).toBeVisible();
  await expect(alerta).toContainText("no puede superar los 100");

  // Y en la lista no aparecio nada: el formulario no "parecio" fallar, de
  // verdad no se creo.
  await page.goto("/tutorials");
  await expect(page.getByText(title)).toHaveCount(0);
});

test("buscar por titulo encuentra el tutorial recien creado", async ({ page }) => {
  // Mi tercer flujo: buscar es lo que el usuario hace todos los dias — si
  // manana la busqueda no anda, me escriben. Y toca la base, que es el
  // desempate que recomienda la consigna cuando dudas entre dos.
  const title = tituloUnico("busqueda");

  await crearDesdeLaPantalla(page, title, "para buscarlo despues");
  await expect(page.getByText("You submitted successfully!")).toBeVisible();

  await page.goto("/tutorials");
  // Recargar no es un adorno: vuelve a pedirle la lista a la api, asi que lo
  // que se ve despues salio de la base y no de un estado que quedo en React.
  await page.reload();

  await page.getByLabel("Buscar por titulo").fill(title);
  await page.getByRole("button", { name: "Search" }).click();

  // La lista queda con un solo item, y es el mio: el filtro filtro de verdad.
  const lista = page.getByRole("list", { name: "Tutoriales" });
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: `Borrar ${title}` }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});
