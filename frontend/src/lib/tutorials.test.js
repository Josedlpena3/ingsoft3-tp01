import {
  estadoLegible,
  resumirDescripcion,
  filtrarPorTitulo,
  buscarTutoriales
} from "./tutorials";

// ── estadoLegible ─────────────────────────────────────────────────────────────

describe("estadoLegible", () => {
  it.each([
    ["publicado", { published: true }, "Publicado"],
    ["sin publicar", { published: false }, "Pendiente"],
    ["sin el campo", {}, "Pendiente"],
    ["undefined", undefined, "Pendiente"]
  ])("devuelve el texto correcto para un tutorial %s", (_caso, entrada, esperado) => {
    expect(estadoLegible(entrada)).toBe(esperado);
  });
});

// ── resumirDescripcion ────────────────────────────────────────────────────────

describe("resumirDescripcion", () => {
  it("deja el texto intacto si entra en el largo", () => {
    expect(resumirDescripcion("Algebra lineal", 40)).toBe("Algebra lineal");
  });

  it("corta y agrega puntos suspensivos si se pasa", () => {
    // Arrange
    const largo = "a".repeat(50);
    // Act
    const resultado = resumirDescripcion(largo, 40);
    // Assert
    expect(resultado).toHaveLength(43);
    expect(resultado.endsWith("...")).toBe(true);
  });

  // Borde exacto: con 40 no corta, con 41 sí. Si alguien cambia el <= por <,
  // este test se pone en rojo.
  it.each([
    [40, false],
    [41, true]
  ])("con %i caracteres, ¿corta? %s", (largo, deberiaCortar) => {
    const resultado = resumirDescripcion("a".repeat(largo), 40);
    expect(resultado.endsWith("...")).toBe(deberiaCortar);
  });

  it("devuelve cadena vacia si no le pasan un texto", () => {
    expect(resumirDescripcion(null)).toBe("");
    expect(resumirDescripcion(undefined)).toBe("");
  });
});

// ── filtrarPorTitulo ──────────────────────────────────────────────────────────

describe("filtrarPorTitulo", () => {
  const lista = [
    { title: "Algebra lineal" },
    { title: "Analisis matematico" },
    { title: "Fisica" }
  ];

  it("filtra sin distinguir mayusculas", () => {
    expect(filtrarPorTitulo(lista, "ALGEBRA")).toEqual([{ title: "Algebra lineal" }]);
  });

  it("devuelve la lista completa si no hay termino", () => {
    expect(filtrarPorTitulo(lista, "   ")).toHaveLength(3);
  });

  it("devuelve lista vacia si le pasan algo que no es una lista", () => {
    expect(filtrarPorTitulo(null, "algo")).toEqual([]);
  });
});

// ── buscarTutoriales — con MOCK del servicio ──────────────────────────────────

describe("buscarTutoriales", () => {
  it("le pide al servicio y devuelve los datos", async () => {
    // Arrange — doble del servicio: no sale a la red
    const service = {
      findByTitle: jest.fn().mockResolvedValue({ data: [{ title: "Algebra" }] })
    };

    // Act
    const resultado = await buscarTutoriales(service, "Algebra");

    // Assert
    expect(service.findByTitle).toHaveBeenCalledWith("Algebra");
    expect(resultado).toEqual([{ title: "Algebra" }]);
  });

  it("devuelve lista vacia si la API falla", async () => {
    // Caso de error: la API se cae. El componente no tiene que explotar.
    const service = { findByTitle: jest.fn().mockRejectedValue(new Error("500")) };

    const resultado = await buscarTutoriales(service, "Algebra");

    expect(resultado).toEqual([]);
  });

  it("devuelve lista vacia si la respuesta no trae un array", async () => {
    const service = { findByTitle: jest.fn().mockResolvedValue({ data: null }) };
    expect(await buscarTutoriales(service, "x")).toEqual([]);
  });
});
