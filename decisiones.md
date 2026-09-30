# Decisiones

Un documento por semestre, una sección por práctico.

---

## TP1 — Git colaborativo

**Por qué Git no resolvió el conflicto solo.** Las ramas A y B salieron del mismo commit y
cambiaron la misma línea del README. Cuál versión queda es una decisión de contenido, no algo
automatizable, así que Git me lo delegó con los marcadores. Para que nunca hubiera aparecido tendría
que haber creado B **después** de mergear A, o no tocar la misma línea en las dos.

**Por qué protegí `main`.** Para que el proceso no dependa de que nadie se equivoque. Puse PR
obligatorio con cero aprobaciones y *Do not allow bypassing*, así la regla me alcanza también a mí.
Cero porque trabajo solo y GitHub nunca deja aprobar tu propio PR; en un equipo irían uno o más
revisores.

**Problemas.**

- Dejé *Require approvals* en 1 y, siendo el único colaborador, no podía aprobar mi propio PR. Lo
  puse en 0.
- El repo nació sin README: lo noté porque en `git status` aparecía "sin seguimiento" en vez de
  "modificado".
- zsh no toma `#` como comentario en modo interactivo. Copié un comando con un comentario al final y
  tomó esas palabras como argumentos de `git push`.
- Al consolidar el repo encontré dos cosas mal cerradas: `evidencias.md` había entrado a `main`
  **vacío** —el commit estaba hecho, el contenido no, y `git status` no avisa de eso— y el tag
  `v1.0.0` apuntaba a un commit anterior a la documentación. Corregí las dos y moví el tag.

**IA.** Le pregunté a Claude cuando me trabé, sobre todo con el editor de conflictos: me explicó qué
era cada marcador y que hay que borrarlos a mano. Verifiqué cada paso mirando el resultado en GitHub
antes de seguir.

---

## TP2 — Contenedores

**Por qué esta app.** Backend `node-express-mongodb` + frontend `react-hooks-crud-web-api`, de
bezkoder. Corre local sin drama y lo probé antes de elegirla; back y front están **separados**, que
es requisito —descarté una Next.js propia porque al ser SSR los mezcla en un proceso y no permite
dos Dockerfiles con proxy—; es chica (un CRUD de Tutorials); y la entiendo lo suficiente para
modificarla, de hecho tuve que tocarle la conexión a la base y la URL de la API.

**Por qué dos etapas.** Compilar y ejecutar necesitan cosas distintas. El frontend buildea con
`node:16-alpine` (170 MB) y la imagen final es nginx con los estáticos: **77,9 MB, menos de la
mitad** — el compilador no viaja a producción. El backend es al revés y conviene saberlo: pesa
236 MB, más que su base, porque Node necesita su runtime y no hay binario que copiar; ahí lo que
ahorra el multi-stage son las dependencias de desarrollo (`--omit=dev`). Uso Node 16 en el front
porque react-scripts 4 trae un webpack incompatible con OpenSSL 3, el de Node 17 en adelante. El
backend corre con `USER node`, no como root.

**Cómo se encuentran los servicios.** Compose crea una red con DNS interno: el backend se conecta a
`db`, no a una IP. El frontend es el caso trampa: es una SPA, su JavaScript corre en el **navegador**,
fuera de esa red, así que no puede pedirle nada a `backend:8080` — ese nombre no resuelve ahí. Por
eso llama a rutas relativas y nginx, que sí está adentro, las reenvía. De paso no hace falta CORS:
para el navegador todo sale del mismo origen.

**`healthcheck` vs `depends_on`.** No son lo mismo. `depends_on` sólo espera a que el contenedor
**arranque**; Mongo tarda unos segundos más en aceptar conexiones y el backend se moría con
`ECONNREFUSED` en ese hueco. Se arregla con las dos juntas: un `healthcheck` que pregunta si la base
responde, y `depends_on: condition: service_healthy` que espera a que ese chequeo pase.

**Dónde viven los secretos.** En un `.env` que no se commitea, con un `.env.example` que sí. Al
clonar, el `.env` no está y Compose **no falla**: reemplaza las variables que faltan por vacío y
sigue, hasta que Mongo se niega a arrancar sin contraseña. Por eso el `cp .env.example .env` es el
primer paso del README, no el último.

**Qué persiste.** Los datos van a un volumen nombrado, no a la capa de escritura del contenedor. Lo
probé: `down` los conserva y `down -v` los borra. Los contenedores se destruyen en los dos casos —
la única diferencia es el volumen.

**Problemas.**

- `error:0308010C:digital envelope routines::unsupported` al buildear el front con Node 20 → bajé a
  Node 16 en la etapa de build.
- `ECONNREFUSED` al arrancar: Docker Desktop estaba instalado pero no abierto.
- La conexión a Mongo estaba hardcodeada a `localhost`, que dentro de un contenedor es el contenedor
  mismo → la saqué a la variable `MONGO_URL`.
- Las imágenes en ghcr.io nacen privadas. Las pasé a Public a mano y lo confirmé con un `docker
  pull` sin estar logueado.

**IA.** Usé la IA del editor para generar los archivos de contenerización a partir de un prompt con
los requisitos, y consulté a Claude para los errores de Docker. Lo verifiqué a mano: multi-stage con
`grep -c FROM`, no-root con `grep USER`, la persistencia con `down` / `down -v`, la conexión a la
base en los logs, y el `docker-compose.registry.yml` levantando el stack sin buildear.

---

## Consolidación del repositorio

El TP2 lo empecé en otro repo y el reglamento pide uno solo para todo el semestre. Lo uní con
`git merge --allow-unrelated-histories` en vez de copiar archivos, para conservar los commits con su
fecha real, y mergeé ese PR con **merge commit** en lugar de squash, que los habría aplastado en uno.

Por el camino descubrí que el commit de documentación del TP2 **nunca se había pusheado**: en GitHub
faltaban `README.md`, `decisiones.md`, `evidencias.md` y `docker-compose.registry.yml`. `git status`
decía "working tree clean" y nada avisa; sólo se ve con `git log origin/main..main`.

`v2.0.0` apunta al cierre del TP2 y no a correcciones posteriores de la documentación: `decisiones.md`
y `evidencias.md` son acumulativos, así que ningún tag puede contener la versión final de un archivo
que sigue creciendo. Los tags congelan código y configuración; la documentación al día se lee en
`main`.

---

## TP3 — Planificación y trazabilidad

Tablero: <https://github.com/users/Josedlpena3/projects/1>

**Sprint de 1 semana.** Para que espeje la cadencia real de la materia: una clase por semana, un
práctico por clase. Con dos semanas el sprint terminaría a mitad de un práctico y la revisión no
coincidiría con ninguna entrega.

**Límite de trabajo en progreso: 2.** La regla es personas + 1, y trabajo solo. El "+1" es la
válvula para cuando algo queda esperando algo que no depende de mí —una corrida de CI, una
revisión— y necesito avanzar sin dejar la primera a medias. En 1 me quedaría mirando el pipeline; en
5 dejaría de limitar y vuelvo a empezar mucho y terminar poco. Lo subiría si sumo gente al equipo; si
**nunca lo alcanzo**, quedó demasiado alto. Y es un acuerdo, no un candado: GitHub pone la columna en
rojo pero deja pasar.

**La historia mal escrita.** *"Como desarrollador quiero crear la tabla usuarios para guardar los
datos"* es una **tarea disfrazada de historia**: el rol es el propio equipo, nadie "quiere" una tabla,
el "para" no da ningún beneficio observable y no hay forma de verificarla. De INVEST viola *Valiosa*
y *Testeable*. La reescribo así: *"Como usuario registrado quiero que mis datos sigan estando cuando
vuelvo a entrar, para no tener que cargarlos de nuevo"*, con criterios comprobables. "Crear la tabla"
no desaparece: baja a ser una **tarea** de esa historia.

**Por qué el bug va al costado.** La jerarquía cuenta lo que **planifiqué construir**; un bug es un
defecto de algo **ya construido**, no era parte del plan. Colgarlo de la historia además haría mentir
su barra de progreso, porque ya está cerrada. Y si el defecto aparece con la historia todavía en
curso, no es un bug: es que no cumple sus criterios de aceptación.

**Trazabilidad.** El PR #12 lleva `Closes #9` en la descripción y cerró la tarea solo al mergear. Va
el número de la **tarea**, no el de la historia: un PR implementa una tarea concreta. Por eso la
historia #8 y la tarea #10 quedan **abiertas** — el trabajo sigue en el TP4 y el TP5.

**Problemas.**

- El Project creado por comando nace **privado** y sin el workflow de auto-add, así que el tablero
  queda vacío. Agregué los issues con `gh project item-add` y lo hice público. No di la visibilidad
  por buena mirando la configuración: pedí la URL **sin credenciales** y confirmé que devuelve 200,
  porque un Project privado da 404 y el entregable es la URL.
- `gh` necesita el scope `project`, que no viene de fábrica.
- Dejé tres `gh auth login` abiertos a la vez. Cada uno genera un código de un solo uso distinto, así
  que el navegador mostraba uno y la terminal esperaba otro: autorizaba y no pasaba nada.

**IA.** El TP3 y el TP4 los hice con **Claude Code, un agente que opera la terminal**. Ejecutó los
comandos: instalar y configurar `gh`, crear los labels, los issues y los sub-issues, crear el Project
y hacerlo público, y abrir y mergear los PRs. Yo decidí la duración del sprint y el número de WIP, y
configuré el tablero a mano porque la API no expone las vistas ni el campo Iteration. Lo verifiqué
consultando la API en vez de creer la salida de los comandos: el árbol de sub-issues, el timeline del
issue #9 confirmando que lo cerró el PR #12, y la visibilidad sin credenciales.

---

## TP4 — CI: Pipelines as Code

**Por qué esos jobs y por qué en paralelo.** Uno por imagen. Son artefactos independientes y cada job
corre en **su propia máquina limpia**, sin compartir filesystem, así que no hay razón para
encadenarlos. En serie el tiempo total sería la suma de los dos; en paralelo es el más lento, y el
frontend tarda bastante más que el backend.

**Por qué construye con mi Dockerfile.** Si el pipeline compilara por su cuenta habría **dos
definiciones de build** —la del YAML y la del Dockerfile— que tarde o temprano divergen, y estaría
verificando una compilación distinta de la que después se despliega. Efecto lateral bueno: el
workflow no tiene una sola línea de Node y le sirve a cualquier stack.

**Qué se cachea y qué pasa si desaparece.** Las capas de las imágenes, en el cache de Actions
(`type=gha`). Cada job usa su propio `scope`; sin eso comparten estante y **se pisan** — uno muestra
`CACHED` y el otro no, y cuál cambia en cada corrida. Hace falta además `setup-buildx-action`, porque
el constructor de fábrica guarda las capas en el disco de la máquina y no sabe exportarlas afuera; si
me lo olvido, el build **falla**. **Si el cache desaparece no pasa nada**: el pipeline funciona igual,
sólo más lento. Si *fallara* sin cache no tendría un cache, tendría una dependencia escondida. En mi
segunda corrida se reutilizaron 5 capas en el backend y 7 en el frontend.

**El gate.** `main` exige hoy **dos** cosas: que el cambio entre por PR (TP1) y que los dos checks
estén en verde (TP4). `strict: true` agrega que la rama esté actualizada con `main`, porque un verde
sacado contra un `main` viejo puede romper al combinarse. Los approvals van en 0: lo que bloquea acá
es el pipeline, no una aprobación humana.

**La demostración.** Rompí el build con un import a un archivo inexistente, en el **frontend** a
propósito: el backend es Express, no compila, su Dockerfile sólo hace `npm install` y `COPY`, así que
romperle el código daría verde igual. El front sí empaqueta durante el `docker build`. GitHub
contestó *"the base branch policy prohibits the merge"*; un commit de fix lo destrabó. Dejé un
segundo PR abierto porque `strict` sólo se puede mostrar con dos PRs a la vez.

**Problemas.**

- `backend/package-lock.json` está gitignoreado y no viaja al runner — la trampa clásica del "anda en
  mi máquina". No rompe porque el Dockerfile lo copia con un glob opcional, pero lo verifiqué antes de
  pushear: exporté el repo con `git archive`, que es lo mismo que clona el runner, y construí las dos
  imágenes con `--no-cache`.
- Para ver `CACHED` hacen falta dos corridas **del mismo PR, una después de la otra**: si van
  seguidas se solapan y la segunda empieza a construir antes de que la primera suba su cache.
- El cache no se comparte entre ramas: una corrida sólo ve el de su propia rama y el de la base.

**IA.** Igual que el TP3: Claude Code operando la terminal. Escribió el workflow, configuró los
required status checks y abrió y mergeó los PRs. Yo decidí romper el frontend y no el backend, una vez
que entendí que el back no compila y daría verde igual. Lo verifiqué construyendo las dos imágenes en
local antes de pushear nada, buscando `CACHED` en el log de la segunda corrida, e intentando mergear
el PR roto de verdad para ver el mensaje del gate en vez de suponerlo.

---

## TP5 — Calidad automatizada: tests, cobertura y el umbral que frena un merge

### Qué elegí testear y por qué

Mi app era un CRUD pelado: el controller chequeaba que el título no estuviera vacío y el resto era
pasarle cosas a Mongoose. No había lógica que verificar, así que **agregué las reglas de negocio** y
las testeé. Son siete:

1. **Validación del título** — obligatorio, entre 3 y 100 caracteres. Antes sólo se miraba que no
   fuera vacío, así que `"   "` pasaba igual.
2. **Normalización de la entrada** — recorta los extremos, colapsa espacios dobles, descripción
   ausente como `""` y `published` en `false` salvo que sea `true` explícito.
3. **No se puede publicar sin descripción** — lo que se publica lo lee otro, y un tutorial vacío no
   le sirve a nadie.
4. **Escapado de la búsqueda** — y ésta es la que arregla un bug que ya tenía.
5. **Resumen de la colección** — cuenta publicados y pendientes, calcula el avance.
6. **Etiqueta del avance** — traduce el porcentaje a un texto legible.
7. **Orden alfabético** — ignorando mayúsculas y acentos.

**Dónde dolía un bug en mi app:** en la regla 4. El `findAll` hacía `new RegExp(title)` con el texto
**crudo** del usuario. Buscar `(` o `[` hace que `RegExp` lance, y la API respondía **500**. Es el bug
que elegí como caso testigo porque no lo veía nadie: la búsqueda "funcionaba" mientras nadie
escribiera un paréntesis.

Del lado del front saqué la lógica de presentación de los componentes a `src/lib/tutorials.js`
—estado legible, resumen de la descripción, filtro y búsqueda— para poder testearla sin montar el DOM.

### Por qué tuve que refactorizar para poder mockear

`crearTutorial` originalmente agarraba el modelo de Mongoose por su cuenta con un `require` adentro.
Así no hay forma de testearla sin una base corriendo.

Lo cambié para que **el repositorio entre como parámetro**: `crearTutorial(repo, datos)`. En
producción recibe el modelo real; en los tests recibe un `jest.fn()`. Lo mismo del lado del front con
`buscarTutoriales(service, titulo)`.

Ese cambio es lo único que hacía falta, y es lo que separa código testeable de código que no lo es:
la dependencia entra desde afuera en vez de buscarse adentro.

### Mi umbral: 90 % de líneas y 85 % de ramas

Lo medí antes de elegirlo. Sobre la lógica da hoy **100 % de líneas y 95 % de ramas** en el backend,
y **100 % y 90,47 %** en el frontend.

Elegí 90/85 y no el número que ya tenía porque un umbral pegado a la medición actual frena en cuanto
agrego cualquier cosa, y uno muy por debajo no frena nunca. Con 90 hacen falta unas cinco líneas
nuevas sin test para romperlo — suficiente margen para que el código crezca, suficiente presión para
que no crezca sin tests.

**Sobre qué métrica:** el umbral va sobre **líneas y ramas** a la vez. La de ramas es la que más me
importa, porque es la que puede mentir menos: se puede tener 100 % de líneas con la mitad de los `if`
sin probar por un solo lado.

**Qué haría falta para subirlo:** cubrir el controller, que hoy está afuera. Eso necesita `supertest`
y levantar Express, que ya es integración — trabajo del TP7.

### Qué dejé afuera de la cuenta, y por qué

**Backend:**

- `app/models/` — el esquema de Mongoose. Es definición de datos, no lógica.
- `app/config/` — la cadena de conexión.
- `app/routes/` — la tabla de rutas. Declarativa: no hay nada que decidir.
- `app/controllers/` — la capa HTTP. No tiene reglas propias: traduce `req`/`res` y delega.
  Verificarla de verdad necesita integración, que es el TP7.

**Frontend:**

- `src/components/` — la interfaz. Se verifica con pruebas e2e en el TP7.
- `src/services/TutorialService.js` — la capa HTTP del front: siete funciones de una línea que llaman
  a axios. Testearla sería comprobar que axios es axios.
- `index.js` y `serviceWorker.js` — el arranque.

El criterio es el mismo de los dos lados: **entra en la cuenta lo que tiene decisiones; queda afuera
lo que sólo traduce o declara.**

### El ejercicio de la rama sin cubrir

Me quedan cuatro ramas sin recorrer, y son todas del mismo tipo.

**Backend — `app/domain/tutorial.rules.js`, líneas 26 y 37:**

    const entrada = datos || {};

El camino que no recorre ningún test es el del `|| {}`: el que se toma cuando `datos` llega `null` o
`undefined`. Todos mis tests le pasan un objeto.

**Qué entrada la recorrería:** `normalizarTutorial(undefined)` o `validarPublicacion(null)`.

**Frontend — `src/lib/tutorials.js`, líneas 23 y 25:** lo mismo con `String(termino || "")` y
`String(t.title || "")`. La recorrería `filtrarPorTitulo([{}], undefined)`, o sea un tutorial sin
título.

**Qué decidí hacer:** dejarlas sin cubrir. Son **guardas defensivas** contra un caso que hoy no puede
pasar: a esas funciones sólo las llama el controller, y lo que les pasa es `req.body`, que Express
garantiza que es un objeto. Un test que les mande `undefined` subiría el número al 100 % pero estaría
verificando una situación que mi app no produce — sumaría cobertura sin sumar confianza, que es justo
lo que no quiero. Las dejo escritas igual porque cuestan una línea y protegen si mañana alguien llama
a la función desde otro lado.

### Por qué coverage alto no garantiza calidad

Con mi propio código: podría escribir este test y sumar cobertura sin verificar nada.

    it("no verifica nada", () => {
      validarTitulo("");        // recorre la línea, suma al porcentaje
      expect(true).toBe(true);  // pero no comprueba el resultado
    });

La cobertura mide **qué líneas se ejecutaron**, no **qué se comprobó**. Un test sin `expect` útil
cuenta igual que uno bueno.

Mi criterio para saber si un test sirve es otro: **si invierto la regla que prueba, algo tiene que
ponerse en rojo.** Por eso los casos de borde — si alguien cambia el `>= 50` de `etiquetaDeAvance`
por un `> 50`, el test del 50 exacto falla. Sin ese caso, el cambio pasaría con la cobertura intacta.

### El Pull Request bloqueado

**PR #25** — <https://github.com/Josedlpena3/ingsoft3-tp01/pull/25>

Agregué `resumirColeccion` y `etiquetaDeAvance` **sin tests**. El código compilaba perfecto y **los 27
tests existentes pasaban todos**. El merge quedó bloqueado igual.

Qué se puso en rojo: el check **`build-backend`**. `build-frontend` quedó en verde, porque el código
nuevo era sólo del backend.

En qué métrica — el log lo dice textual:

    Tests:     27 passed, 27 total
    Branches:  55% ( 22/40 )
    Lines:     74.41% ( 32/43 )
    Jest: "global" coverage threshold for branches (85%) not met: 55%
    Jest: "global" coverage threshold for lines (90%) not met: 74.41%

Corrida roja: <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36761704673>

**Qué escribí para arreglarlo:** 13 tests sobre las dos funciones nuevas — los cuatro tramos de
`etiquetaDeAvance` con sus bordes exactos (100, 50, 49, 0), el caso de la lista vacía para que no
divida por cero, y las entradas inválidas. Con eso volvió a 100 % de líneas y 95 % de ramas, y el PR
se destrabó.

**PR #26, abierto y en rojo:** <https://github.com/Josedlpena3/ingsoft3-tp01/pull/26> — el mismo
problema sin arreglar, para que se pueda comprobar que el freno sigue vigente.

### Por qué este freno es distinto del del TP4

El del TP4 pregunta *"¿compila?"*. Éste pregunta *"¿está verificado?"*.

Y ésa es la diferencia que hace interesante al PR #25: **compilaba y los tests pasaban**, y lo frenó
igual. El gate del TP4 nunca lo habría parado.

**Qué deja pasar igual:** código cubierto por tests que no comprueban nada, y cualquier error de
diseño o de producto. Que esté verificado no quiere decir que esté bien pensado.

### Mi stack, que no es el de la cátedra

La guía usa .NET + vitest. Yo tengo Node/Express + React con react-scripts, así que la tabla de
equivalencias me llevó a la columna de JS:

| Lo que había que lograr | Lo que usé |
|---|---|
| Dónde viven los tests | Al lado del código, `algo.test.js` |
| Un test parametrizado | `it.each` |
| Que la dependencia entre desde afuera | Parámetro de la función (`repo`, `service`) |
| Fabricar el doble | `jest.fn()` |
| Medir la cobertura | `jest --coverage` · `react-scripts test --coverage` |
| Un umbral que rompe el build | `coverageThreshold` de jest |
| Qué entra en la cuenta | `collectCoverageFrom` |
| Reporte legible | `lcov` + `json-summary` |
| Que las herramientas entren al Dockerfile | `npm ci` **sin** `--omit=dev` |

### Cómo corre en el pipeline

Los tests corren **dentro del build de la imagen**, en una etapa `test` del Dockerfile. Lo hice así
para no romper la decisión del TP4: sigue habiendo **una sola definición de build**. Si la cobertura
no llega, ese `RUN` devuelve distinto de cero y el build se corta.

Para poder sacar el reporte del build sin arrastrar todo el sistema de archivos agregué una etapa
`coverage` sobre `scratch`, que contiene únicamente la carpeta del reporte. El workflow la exporta,
escribe el resumen en la corrida y publica el reporte como artefacto descargable.

Corrida verde con los dos resúmenes y los dos artefactos:
<https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36762868725>

### Problemas que encontré

- **`npm ci` no funcionaba en ninguno de los dos lados.** En el backend porque `package-lock.json`
  estaba en el `.gitignore` —o sea que no viajaba al runner— y en el frontend porque el lockfile
  estaba desincronizado de `package.json` desde antes (`type-fest@0.11.0` contra `0.13.1`). Por eso el
  Dockerfile del front usaba `npm install` y nunca se había notado. Saqué el lockfile del `.gitignore`
  y regeneré el del frontend.
- **Las etapas del Dockerfile que nadie referencia no se construyen.** Con BuildKit, si la etapa final
  no depende de la etapa de tests, los tests **no corren**. Lo resolví apuntando el pipeline
  directamente a la etapa con `target:`.
- **El build del front no compila con Node 20** — es el mismo `ERR_OSSL_EVP_UNSUPPORTED` del TP2. En
  Docker no pasa porque la etapa de build usa `node:16-alpine`.
- **Commiteé sin querer la carpeta `coverage/`**, que es generada. La saqué y la agregué al
  `.gitignore` de los dos lados.

### Declaración de uso de IA

Resolví el TP con ayuda de Claude, usándolo como asistente de chat para escribir los tests y la
configuración de cobertura. Las decisiones del trabajo fueron mías: elegí las cuatro reglas
iniciales, definí el umbral de cobertura (90/85) después de ver la medición real, y decidí excluir el
controller de la cuenta.
