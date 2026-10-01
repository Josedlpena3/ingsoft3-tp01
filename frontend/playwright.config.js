// Configuracion compartida por las DOS suites que viven en e2e/:
//   - api.spec.js        integracion: pedidos HTTP a la api de QA, sin navegador
//   - tutoriales.spec.js e2e: un navegador de verdad usando el front de QA
//
// Las dos corren contra el entorno desplegado, no contra un build local.

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",

  // Tope de CADA test. Generoso para las e2e (un navegador real, por red);
  // de sobra para los pedidos a la api.
  timeout: 60_000,

  // Tope de CADA afirmacion. No lo hereda del de arriba: el default son 5s, y
  // eso alcanza para fabricar un rojo falso cuando el contenedor recien arranca.
  expect: { timeout: 15_000 },

  use: {
    // El FRONT de QA. La api tiene su propia direccion (API_BASE_URL), que lee
    // api.spec.js: son dos servicios distintos.
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",

    // Se graban solo cuando algo falla, que es cuando sirven: el reporte del
    // artefacto trae la captura y la traza del fallo.
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },

  // Un reintento: absorbe una demora suelta de la red o un contenedor que
  // todavia esta despertando. No tapa un error de verdad — si falla las dos
  // veces queda rojo — pero marca el test como "flaky" en el reporte, que es
  // justamente lo que hay que ir a mirar.
  retries: 1,

  // Un solo worker, a proposito: QA es UN entorno con UNA base, compartida por
  // las dos suites. En paralelo, dos tests podrian contarse los datos entre si.
  workers: 1,

  // html → el artefacto que se baja para diagnosticar un rojo (captura + traza)
  // json → lo lee el pipeline para escribir cuantos tests pasaron en el resumen
  // list → el log legible en vivo, mientras la corrida avanza
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "playwright-results.json" }],
    ["list"]
  ]
});
