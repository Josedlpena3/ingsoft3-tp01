const { crearTutorial, ErrorDeValidacion } = require("./tutorial.service");

// Estos tests usan un DOBLE del repositorio (jest.fn()).
// No hay Mongo corriendo: se verifica el comportamiento de la función,
// no el de la base.

describe("crearTutorial", () => {
  it("guarda el tutorial ya normalizado a traves del repositorio", async () => {
    // Arrange — el doble devuelve lo que le pasan, como haría el modelo real
    const repo = { create: jest.fn().mockResolvedValue({ id: "abc" }) };

    // Act
    const resultado = await crearTutorial(repo, {
      title: "  Algebra   lineal ",
      description: "  Matrices  ",
      published: true
    });

    // Assert — el repo recibió los datos LIMPIOS, no los crudos
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledWith({
      title: "Algebra lineal",
      description: "Matrices",
      published: true
    });
    expect(resultado).toEqual({ id: "abc" });
  });

  it("no toca el repositorio si el titulo es invalido", async () => {
    // Arrange
    const repo = { create: jest.fn() };

    // Act + Assert — falla antes de llegar a la base
    await expect(crearTutorial(repo, { title: "ab" })).rejects.toThrow(ErrorDeValidacion);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("no toca el repositorio si se intenta publicar sin descripcion", async () => {
    const repo = { create: jest.fn() };

    await expect(
      crearTutorial(repo, { title: "Analisis matematico", published: true })
    ).rejects.toThrow("No se puede publicar un tutorial sin descripcion");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("propaga el error si el repositorio falla", async () => {
    // Caso de error: la base se cae. La función no lo tapa.
    const repo = { create: jest.fn().mockRejectedValue(new Error("conexion perdida")) };

    await expect(
      crearTutorial(repo, { title: "Fisica cuantica" })
    ).rejects.toThrow("conexion perdida");
  });
});
