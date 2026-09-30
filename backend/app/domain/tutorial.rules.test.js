const {
  validarTitulo,
  normalizarTutorial,
  validarPublicacion,
  escaparRegex,
  construirFiltroBusqueda
} = require("./tutorial.rules");

// ── Regla 1: el título ────────────────────────────────────────────────────────

describe("validarTitulo", () => {
  // Parametrizado: cinco entradas inválidas distintas contra la misma regla.
  it.each([
    ["cadena vacia", "", "El titulo es obligatorio"],
    ["solo espacios", "     ", "El titulo es obligatorio"],
    ["undefined", undefined, "El titulo es obligatorio"],
    ["mas corto que el minimo", "ab", "El titulo debe tener al menos 3 caracteres"],
    ["mas largo que el maximo", "x".repeat(101), "El titulo no puede superar los 100 caracteres"]
  ])("rechaza un titulo %s", (_caso, entrada, mensajeEsperado) => {
    // Arrange en el propio parámetro · Act
    const resultado = validarTitulo(entrada);
    // Assert
    expect(resultado).toBe(mensajeEsperado);
  });

  it("acepta un titulo valido y no devuelve error", () => {
    const resultado = validarTitulo("Analisis matematico");
    expect(resultado).toBeNull();
  });

  // Casos de borde: 3 y 100 son válidos; 2 y 101 no. Si alguien cambia
  // un `<` por un `<=` en la regla, este test se pone en rojo.
  it.each([
    [3, null],
    [100, null]
  ])("acepta el borde exacto de %i caracteres", (largo, esperado) => {
    expect(validarTitulo("x".repeat(largo))).toBe(esperado);
  });
});

// ── Regla 2: normalización ────────────────────────────────────────────────────

describe("normalizarTutorial", () => {
  it("recorta los extremos y colapsa los espacios internos", () => {
    // Arrange
    const entrada = { title: "  Algebra   lineal  ", description: "  dos   materias " };
    // Act
    const resultado = normalizarTutorial(entrada);
    // Assert
    expect(resultado.title).toBe("Algebra lineal");
    expect(resultado.description).toBe("dos materias");
  });

  it("completa los valores ausentes con sus defaults", () => {
    const resultado = normalizarTutorial({ title: "Fisica" });
    expect(resultado).toEqual({ title: "Fisica", description: "", published: false });
  });

  it("solo toma published como true si es el booleano true", () => {
    // "true" en texto no alcanza: viene de un formulario y no es lo mismo.
    expect(normalizarTutorial({ title: "Quimica", published: "true" }).published).toBe(false);
    expect(normalizarTutorial({ title: "Quimica", published: true }).published).toBe(true);
  });
});

// ── Regla 3: no se publica sin descripción ────────────────────────────────────

describe("validarPublicacion", () => {
  it("rechaza publicar un tutorial sin descripcion", () => {
    const resultado = validarPublicacion({ title: "Analisis", description: "  ", published: true });
    expect(resultado).toBe("No se puede publicar un tutorial sin descripcion");
  });

  it("permite publicar cuando hay descripcion", () => {
    const resultado = validarPublicacion({ title: "Analisis", description: "Limites", published: true });
    expect(resultado).toBeNull();
  });

  it("no exige descripcion si el tutorial queda sin publicar", () => {
    const resultado = validarPublicacion({ title: "Analisis", description: "", published: false });
    expect(resultado).toBeNull();
  });
});

// ── Regla 4: escapado de la búsqueda ──────────────────────────────────────────

describe("construirFiltroBusqueda", () => {
  // Cada uno de estos caracteres, sin escapar, rompe `new RegExp` y devuelve un 500.
  it.each(["(", "[", "\\", "*", "?", "+"])(
    "no lanza al buscar el metacaracter %s",
    (caracter) => {
      expect(() => construirFiltroBusqueda(caracter)).not.toThrow();
    }
  );

  it("escapa los metacaracteres en vez de interpretarlos", () => {
    expect(escaparRegex("algebra (lineal)")).toBe("algebra \\(lineal\\)");
  });

  it("devuelve un filtro vacio cuando no hay termino de busqueda", () => {
    expect(construirFiltroBusqueda("")).toEqual({});
    expect(construirFiltroBusqueda("   ")).toEqual({});
  });

  it("arma el filtro de Mongo cuando hay termino", () => {
    const filtro = construirFiltroBusqueda("Algebra");
    expect(filtro.title.$options).toBe("i");
    expect(filtro.title.$regex).toBeInstanceOf(RegExp);
  });
});
