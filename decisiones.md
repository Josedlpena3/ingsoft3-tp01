# Decisiones

Un documento por semestre, una sección por práctico.

## Enlaces de este TP (TP7)

| Qué prueba | Dirección |
|---|---|
| Paquete del backend (público, con sus `sha-…`) | <https://github.com/Josedlpena3/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend> |
| Paquete del frontend (público, con sus `sha-…`) | <https://github.com/Josedlpena3/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend> |
| **El commit que rompió la app** (una palabra, en `AddTutorial.js`) | <https://github.com/Josedlpena3/ingsoft3-tp01/commit/4292619ec27354efc83725fffca3a0d3c5136e3b> |
| **La corrida roja**: integración 🟢 · e2e 🔴 · `deploy-prod` sin arrancar | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/37063311727> |
| ↳ reporte `playwright-report-integracion` (en verde) | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/37063311727#artifacts> |
| ↳ reporte `playwright-report-e2e` (en rojo, con la traza) | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/37063311727#artifacts> |
| La corrida completa en verde, hasta PROD | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/37064098081> |
| QA | <http://localhost:3000> · API <http://localhost:8080> |
| PROD | <http://localhost:3001> · API <http://localhost:8081> |

Los entornos corren sobre mi máquina (fallback local, §3.6 del enunciado). Para la defensa levanto
el runner con `cd ~/actions-runner && ./run.sh`, y los dos entornos con el pipeline.

---

## Enlaces de este TP (TP6)

| Qué prueba | Dirección |
|---|---|
| Paquete del backend (público) | <https://github.com/Josedlpena3/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend> |
| Paquete del frontend (público) | <https://github.com/Josedlpena3/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend> |
| Cadena · un PR que pasó todo y **no publicó** | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36767764248> |
| Cadena · `main`, con «publicar» como último paso | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36787476474> |
| El gate diciendo **no**, con motivo | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36776699110> |
| El flujo completo: QA → aprobación → PROD | <https://github.com/Josedlpena3/ingsoft3-tp01/actions/runs/36787476474> |
| QA | <http://localhost:3000> · API <http://localhost:8080> |
| PROD | <http://localhost:3001> · API <http://localhost:8081> |

Los entornos corren sobre mi máquina (fallback local, §3.6 del enunciado). Para la defensa levanto
el runner con `cd ~/actions-runner && ./run.sh`.

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

---

## TP6 — CD: environments, aprobaciones y deployment patterns

Los enlaces de este práctico están arriba de todo, al principio del documento.

### Por qué el artefacto se publica sólo con la verificación en verde

El registry es el lugar del que después se despliega. Si publicara siempre, un tag del registry
dejaría de significar *"esto pasó las pruebas"* y pasaría a significar apenas *"esto se construyó
alguna vez"* — y entonces desplegar desde ahí sería una apuesta.

Mi cadena tiene tres eslabones: **nada entra a `main` sin verde** (los required checks del TP4 y el
umbral del TP5), **sólo `main` publica** (`if: github.ref == 'refs/heads/main'`), y **publicar es el
último paso del job**, después de los tests. El tercero es el que más se saltea: si publicara antes,
las dos primeras garantías no servirían de nada.

En un PR el paso «Entrar al registry» aparece **salteado**, no fallado. Ésa es la diferencia que
prueba que no publica por el `if` y no por un error.

### Continuous Delivery, no Continuous Deployment

Implementé **Delivery**: cada cambio que entra a `main` queda *listo* para producción y llega solo
hasta QA, pero el salto a PROD requiere que una persona apruebe.

Elegí eso porque es lo que corresponde a mi contexto: no tengo observabilidad. En *Deployment* cada
merge llega a producción sin intervención, y eso sólo es responsable cuando el sistema te avisa que
algo se rompió antes que tus usuarios — métricas, alertas, trazas. Yo hoy tengo un smoke test que
dice "responde": con eso no me alcanza para soltarle la mano a producción.

### El diseño de la cadena

    build-backend  ┐
                   ├→ deploy-qa ──→ deploy-prod
    build-frontend ┘   (auto)       (environment: production)

- **`needs`** ordena: `deploy-qa` espera a los dos builds; `deploy-prod` espera a QA. Si QA falla,
  producción ni se plantea.
- **`if: github.ref == 'refs/heads/main'`** en los dos deploys: un PR construye y testea, pero no
  despliega nada.
- **`environment: production`** es lo que enciende el gate. La regla vive en GitHub, no en el
  destino — por eso funciona igual con Render, con Azure o con mi máquina.

**Alcance de los secrets:** `DB_PASSWORD` es secret de repositorio porque los dos entornos lo usan.
En un despliegue real cada entorno tendría el suyo como *environment secret*, para que un job de QA
no pueda ni leer la credencial de producción. Hoy no aplica porque las dos bases son contenedores en
mi máquina, pero es la separación que hay que tener si esto sale a una nube.

### Qué mira mi aprobador antes de aprobar

Tres cosas, y la primera es la que más me importa:

1. **Que QA haga lo que tiene que hacer, no que responda.** El smoke automático dice que hay un 200
   del otro lado. Yo abro la interfaz, creo un tutorial y confirmo que persiste.
2. **Qué commit está en QA.** `/health` devuelve el commit, así que verifico que lo que probé es lo
   que se va a promover.
3. **Qué entra en el cambio.** Leo el diff del PR que lo originó.

Lo hice en serio: **rechacé** un deployment porque QA acababa de levantarse y no había verificado
nada más que el smoke, y aprobé el siguiente recién después de mirar la interfaz.

### Qué prueba mi smoke test y qué no

Pega a tres lugares, con 30 reintentos cada 10 segundos:

- `/health` — el proceso está vivo
- `/api/tutorials` — **la base responde**
- `/` del front — nginx está sirviendo

El segundo es el que evita el falso verde clásico: si sólo mirara `/health`, una base caída pasaría
en verde, porque ese endpoint no la toca a propósito.

**Qué NO prueba.** No dice **qué versión** está corriendo: si el deploy fallara en silencio y
quedara la versión anterior arriba, el smoke daría verde igual. Por eso hice que `/health` devuelva
el commit — es lo que convierte "responde" en "responde *esto*". Tampoco prueba que la app sea
correcta: que devuelva 200 no dice que el alta funcione.

### Lo que gano y lo que pierdo desplegando por imagen

La guía usa Render, que **reconstruye desde el repositorio**: eso rompe la garantía de que lo
desplegado sea lo verificado, porque entre la verificación y el deploy vuelve a construir.

Mi setup no tiene ese problema: los compose usan `image:` con el tag `sha-<commit>`, así que
**despliego exactamente el binario que el pipeline verificó y publicó**. Es la ventaja que el TP7
viene a consolidar y en el fallback local sale gratis.

Lo que pierdo por el fallback local: URLs públicas, entornos ajenos a mi máquina, y cold start real.
Mis dos entornos son dos proyectos de Compose en mi notebook, y si la apago no existen.

### Qué quedó por variable y qué quedó adentro de la imagen

**Por variable** (se resuelven al arrancar): `BACKEND_URL`, que nginx sustituye en su plantilla; la
cadena de conexión a Mongo; y `APP_COMMIT`, que alimenta `/health`.

**Adentro de la imagen**: el código compilado del front, las dependencias y la configuración de
nginx salvo esa variable.

La prueba de que está bien hecho es que **la misma imagen corre en QA y en PROD**. Antes la
dirección del backend estaba en el `nginx.conf` horneado; ahora es una plantilla y la imagen no sabe
en qué entorno está.

### Estrategia de despliegue para una producción real

Elegiría **blue-green**.

**Por qué ése.** Tengo dos entornos completos y un rollback que es cambiar a qué versión apunta: eso
ya es medio blue-green. Con dos slots idénticos, despliego en el que no recibe tráfico, lo verifico
con el sistema real, y recién ahí muevo el tráfico. Si sale mal, vuelvo moviendo el tráfico otra
vez, en segundos.

**Por qué no las otras.** *Canary* es mejor —expone el riesgo al 5 % en vez de al 100 %— pero **no
lo puedo ejecutar hoy**: necesita métricas por versión para decidir si seguir o abortar, y yo no
tengo ninguna. Sin eso, un canary es una ruleta más lenta. *Rolling* evita duplicar infraestructura
pero deja dos versiones conviviendo, y con una sola base compartida eso trae problemas de
compatibilidad de esquema que no quiero. *Feature flags* resuelven otro problema: desacoplan
desplegar de liberar, y se combinan con cualquiera de las tres.

**Qué me falta para ejecutar canary.** Métricas por versión (tasa de error, latencia), un umbral
automático de aborto, y trazas para saber *qué* se rompió. Es el TP9.

**El costo de blue-green**: el doble de infraestructura mientras dura el cambio, y una base que
tiene que funcionar con las dos versiones a la vez — o sea migraciones compatibles hacia atrás.

### Mi plan de rollback, medido

1. Identifico el commit anterior que publicó imagen (`git log` de `main` y verifico el tag en el
   registry).
2. Vuelvo PROD a ese tag: `IMAGE_TAG=sha-<anterior> docker compose -f compose.prod.yml up -d`.
3. Verifico con `/health`, que devuelve el commit — no supongo que volvió, lo confirmo.

**Medido de verdad: 16 segundos**, de arrancar el comando a que `/health` reporte el commit
anterior. El roll-forward tardó 14. Son tan rápidos porque no se construye nada: las imágenes ya
están publicadas y sólo se recrean los contenedores.

**Una honestidad sobre el número:** ésos son los segundos *técnicos*. En un incidente real el reloj
arranca antes — detectar que algo está mal, decidir volver atrás. Eso hoy no lo mido, y sin
observabilidad podría ser mucho más que 16 segundos.

**Un límite que conviene declarar:** este rollback devuelve el *código*, no los *datos*. Si el
despliegue malo migró el esquema, volver la imagen no alcanza.

### La letra chica de mi setup

No uso free tier de nube, así que no tengo cold start ni minutos limitados. Lo que sí tengo:

- **El runner corre en primer plano y no sobrevive a un reinicio.** Hay que levantarlo a mano.
- **Los entornos viven en mi máquina.** Si la apago, no existen — no hay URLs públicas.
- **Las imágenes corren emuladas.** Se publican para x86 y mi Mac es ARM: Rosetta las traduce.
- **Actions es ilimitado en repos públicos**, así que el minutaje no me limita.

### Problemas encontrados

Los cuatro aparecieron desplegando de verdad, y ninguno se ve antes.

**1 · La imagen no tenía variante ARM.** Los runners de GitHub son x86 y mi máquina es ARM64: el
`docker compose pull` fallaba con `no matching manifest for linux/arm64/v8`. Primero lo resolví
construyendo multi-arquitectura con QEMU… y ahí apareció el problema 4.

**2 · El llavero de macOS, inaccesible desde un servicio.** Había instalado el runner como servicio
de launchd para que sobreviviera a los reinicios. El `docker compose pull` quedaba colgado **para
siempre, sin fallar** — lo peor que puede pasar, porque no hay error que leer. La causa: el
credential helper de Docker Desktop pide el llavero, y un servicio sin sesión gráfica recibe
*"keychain cannot be accessed because the current session does not allow user interaction"*. Se
resolvió corriendo el runner en mi sesión con `./run.sh`, que es lo que el enunciado prescribe.

**3 · `docker compose` desapareció.** Intentando esquivar el problema 2, apunté `DOCKER_CONFIG` a un
directorio limpio. El paso falló con `unknown shorthand flag: 'f' in -f`: docker busca sus **plugins
adentro** de `DOCKER_CONFIG`, así que al moverlo perdió el subcomando `compose`.

**4 · La emulación costaba 20 minutos por imagen.** Construir la variante ARM bajo QEMU llevaba más
de veinte minutos *cada una*. Ahí tomé la decisión que más me interesa defender: **publico sólo x86
y las corro con Rosetta**. El pipeline pasó de 25 minutos a menos de dos.

El razonamiento: en la defensa se mergea un cambio y se mira el deploy en vivo, así que la velocidad
del pipeline es un requisito, no una comodidad. Y la contrapartida es chica — los contenedores
corren traducidos, verificado con `process.arch: x64` adentro del contenedor. Para una producción
real sobre ARM publicaría la variante nativa, pero con un runner ARM en vez de emulación.

### Declaración de uso de IA

Usé Claude como ayuda durante el TP. Me ayudó a entender y resolver los problemas que me aparecieron
al desplegar, como el error de la imagen sin variante ARM y el runner que se colgaba sin dar error.
Las decisiones del trabajo las tomé yo, y verifiqué QA a mano antes de aprobar el deploy.

---

## TP7 — Contenedores en el pipeline: integración y e2e como gate

Los enlaces de este práctico están arriba de todo, al principio del documento.

### Build once, deploy many: qué problema resuelve

El escenario del enunciado es QA y PROD comportándose distinto con "el mismo código", porque el
proveedor reconstruye la app en vez de ejecutar la imagen verificada. Entre la verificación y el
deploy hay un `npm install` nuevo, y una dependencia transitiva puede resolver distinto. El código
es el mismo; el binario no.

En mi caso ese hueco ya estaba cerrado desde el TP6: mis dos compose usan `image:` con el tag
`sha-<commit>` y **ninguno** tiene `build:`. El pipeline le pasa `IMAGE_TAG` y compose hace `pull`.
Lo que corre en QA es, bit a bit, lo que el pipeline construyó, testeó y publicó.

Y eso es exactamente lo que vuelve útiles a las dos suites de este TP. Si QA ejecutara una
reconstrucción, mis e2e estarían verificando *otra* construcción del mismo código, y aprobar la
promoción en base a ellas sería una apuesta.

**El `:?` no es un detalle.** Los compose piden `${IMAGE_TAG:?falta IMAGE_TAG}`: si la variable no
está, compose se niega con ese mensaje en vez de inventar una etiqueta. Un deploy que no puede decir
**qué** despliega no debería ocurrir.

### La estrategia de etiquetas, y por qué saqué `latest`

Son dos etiquetas con dos trabajos distintos:

| | Qué garantiza |
|---|---|
| `sha-<commit>` en el registry | **inmutable**: apunta a un binario y nunca se mueve |
| `v7.0.0` en git | **nombre humano**: marca qué commit cerró el práctico |

Hasta el TP6 mi pipeline publicaba las dos: `sha-<commit>` y `latest`. **En este TP saqué `latest`**,
y el motivo es el mismo que ordena todo el práctico: `latest` se mueve. Hoy apunta a una imagen y
mañana a otra, así que un entorno que pidiera `latest` no podría decir qué está corriendo, y dos
deploys con el texto idéntico darían resultados distintos. Dejé la etiqueta vieja sin borrar en el
registry a propósito, para poder mostrar en la defensa que quedó congelada en el último commit que la
publicó y que ya no la sigue nadie.

Mi fallback local tiene una ventaja acá: **no configuro ninguna imagen a mano**. No hay un panel
donde elegí una imagen al crear el servicio; el único lugar donde se decide qué corre es el
`IMAGE_TAG` que el job le pasa a compose. En el riel de Render hay que distinguir entre la imagen con
la que se creó el servicio y la que el hook le mandó después; acá esa diferencia no existe, y se
comprueba con `docker ps`.

### Del tag a la imagen, en un paso

    git rev-list -n1 v7.0.0        # → el commit
    # y esa misma etiqueta sha-<commit> está en los dos paquetes

El tag de git no guarda binarios: guarda un commit. El puente es la convención `sha-<commit>`, que
convierte un nombre de versión en una dirección del registry sin tener que buscar en ningún lado.

### Cómo se comprueba, desde afuera, que el entorno EJECUTA mi imagen

Tres cosas, y ninguna necesita que me crean:

1. `docker ps` muestra el nombre completo de la imagen que cada contenedor está corriendo, con su
   `sha-<commit>`. No es lo que *pedí*: es lo que *está*.
2. `GET /health` devuelve el commit, porque `APP_COMMIT` entra por variable desde el mismo
   `IMAGE_TAG`.
3. El log del job muestra el `pull` bajando ese tag, y en el registry el paquete tiene esa etiqueta.

**Lo que el smoke no alcanza a probar.** El smoke pregunta *"¿responde?"*. Si un deploy fallara en
silencio y quedara la versión anterior arriba, contestaría 200 igual. Por eso `/health` devuelve el
commit: es lo que convierte "responde" en "responde **esto**". Y aun así sigue sin decir si la app
**funciona** — para eso están las dos suites de este TP.

### Qué puse en cada suite, y qué dejé afuera

**Integración (3, contra la api de QA, sin navegador):** alta + verificación + borrado; título vacío
rechazado con 400; y **la tercera, que elegí yo: buscar un título con un paréntesis sin cerrar**.

Elegí ésa porque es un bug que ya me pasó. Antes del TP5 el texto del usuario entraba crudo a
`new RegExp()`, así que buscar `(` hacía lanzar la expresión y la api contestaba 500: **la búsqueda
entera se caía por un carácter**. El unitario del TP5 afirma que `escaparRegex` devuelve la cadena
escapada. Ésta afirma lo que aquel no puede: que **Mongo acepta ese filtro y devuelve el documento**.
Una cosa es escribir bien la expresión; otra es que el motor que la ejecuta esté de acuerdo. Si se
rompe, me escribe cualquiera que haya puesto un paréntesis en un título.

**e2e (3, con navegador, contra el front de QA):** alta; título demasiado largo con el error en
pantalla; y **la tercera, mía: buscar por título**. Buscar es lo que el usuario hace todos los días,
y toca la base — que es el desempate que recomienda el enunciado cuando dudás entre dos flujos.

**Qué NO puse, y por qué.** En e2e no puse validaciones de reglas: que un título de 2 caracteres falle
y uno de 3 pase ya está cubierto por los unitarios del TP5, en milisegundos y sin navegador. Repetir
eso arriba cuesta minutos y no agrega información. En integración no puse nada de pantalla: esa suite
no sabe que el front existe, a propósito — si supiera, dejaría de poder decirme *quién* se rompió.

### Qué prueba cada una, y por qué no es lo mismo

Es el punto del práctico, y lo cobré con mi propia rotura. Cambié **una palabra** en
`AddTutorial.js`: el front pasó a mandar el título en un campo llamado `titulo` en vez de `title`.
No toqué la api, no toqué `e2e/`, y no toqué ningún test.

Resultado de esa corrida:

| | |
|---|---|
| Smoke de QA | 🟢 verde — el sistema respondía |
| Integración | 🟢 **verde** — 3 de 3, en 496 ms |
| e2e | 🔴 **roja** — 3 de 3 fallados, cero salteados |
| `deploy-prod` | **nunca arrancó** — ni llegó a pedir aprobación |

Y eso no es sólo "algo se rompió": es la cadena diciéndome **quién**. A la api le hablé directo, con
el nombre correcto del campo, y su base guardó y borró sin chistar — la api y la base están sanas. El
que no usa bien la api es el front. **Lo diagnostiqué sin abrir el código**, bajando los dos reportes de la
corrida. En la traza del fallo, pestaña *Network*, el `POST` del alta dice todo:

    lo que el navegador mando:  {"titulo":"e2e busqueda 1790974564243", ...}
    lo que la api contesto:     400  {"message":"El titulo es obligatorio"}

Si en cambio hubiera roto la api, la integración se habría puesto roja y **la e2e ni habría
corrido** — su `needs` no se cumple. También es información, y es a propósito: no se gasta un
navegador en confirmar algo que ya sabemos.

Lo que el smoke verde agrega a la historia: el sistema respondía y **aun así estaba roto**. Un `curl`
más no lo habría atajado, porque el smoke sólo ve lo que se me ocurrió preguntarle.

### Por qué mi integración es la amplia

Hay dos formas de escribir esto. La **estrecha** arma la api dentro del propio pipeline contra una
base descartable; la **amplia**, que es la que usé, le habla a la api **ya desplegada** en QA.

Lo que gana la amplia: prueba además que **el despliegue quedó bien** —la imagen, las variables, la
conexión a la base, la red— y no me obliga a levantar una base en el job. Con QA ya corriendo la
imagen exacta de esta corrida, es el mismo concepto con un décimo de la configuración.

Lo que pierde: llega **después** del deploy, así que no puede frenar nada antes de que QA tenga el
cambio; es más lenta; y depende de que QA esté sano, así que un problema de entorno se ve igual que
un problema de código.

### Cold start, flaky, y por qué no hay un solo `sleep`

Un test **flaky** es el que a veces pasa y a veces no sin que el código cambie. Es peor que no tener
test: entrena al equipo a mirar un rojo y decir *"dale de nuevo"* — y el día que el rojo es de verdad,
también lo re-corren.

Lo que hice para no fabricarlos:

- **Esperas explícitas, no `sleep`.** Playwright espera solo a que el elemento aparezca. Un `sleep`
  fijo es la forma más común de fabricar un flaky: o es demasiado corto y falla, o demasiado largo y
  la suite tarda el doble.
- **Tiempos largos a propósito**: 60 s por test y 15 s por afirmación, en vez de los 5 s de fábrica.
- **Un reintento.** Absorbe una demora suelta, pero si falla las dos veces queda rojo. Lo importante:
  un test que pasa recién en el reintento sale marcado **flaky** en el reporte aunque la corrida esté
  verde. Por eso abro el reporte también cuando está en verde.
- **Un solo worker**, porque QA es un entorno con una base compartida por las dos suites.
- **Cero `test.skip`.** Ninguna prueba se saltea sola si el entorno no responde: eso sería un verde
  que no probó nada.

Mis entornos son locales, así que no tengo el cold start del plan gratis. Igual dejé la configuración
preparada, porque el día que esto corra contra una nube que duerme es exactamente lo que hace falta —
y porque el orden de la cadena ya ayuda: el smoke y la integración despiertan QA antes de que entre el
navegador.

### La misma imagen del front en QA y en PROD

Adentro de la imagen quedan los estáticos de React, y `REACT_APP_API_URL=/api` **relativa**: el
bundle no sabe la dirección de ninguna api, le pega a su propio origen.

Por variable queda `BACKEND_URL`, que nginx sustituye en su plantilla **al arrancar el contenedor**,
no al construirlo. Por eso el mismo binario sirve en los dos entornos: cada uno levanta con su
variable y habla con su propio backend. Si la dirección se horneara en el build, harían falta dos
imágenes — y entonces lo que probé en QA no sería lo que corre en PROD.

### Límite conocido: QA es uno solo

Con dos merges seguidos, la corrida B puede redesplegar QA mientras las suites de A lo están usando.
Lo que veo: un rojo que no es de mi código, o algo peor, un verde que en parte probó la imagen de B.
Cómo lo reconozco: miro con `docker ps` qué imagen está corriendo y a qué hora corrió el `deploy-qa`
de B. Qué hago: la corrida A se rechaza con el motivo, y la que vale es la B, que trae los dos
cambios. **Mi regla es un merge por vez** mientras la cadena corre.

El `concurrency` no lo resuelve: cancela lo que está en cola, y un job esperando aprobación no está en
cola. Un equipo real levanta un entorno por corrida, que nace y muere con ella. Eso queda fuera de
este práctico.

### Problemas que me aparecieron

**Las e2e no tenían qué mirar.** Los dos primeros flujos no se podían escribir contra mi app: el
error de la api se iba a `console.log`, así que un alta rechazada no cambiaba nada en pantalla, y la
lista sólo sabía borrar **todo**, así que una prueba no podía sacar su dato sin llevarse los demás.
Agregué un `role="alert"` con el mensaje que escribe la regla del backend, y un botón de borrar por
fila con `aria-label="Borrar <título>"`. No fue esquivar un límite de Playwright: el test me señaló
un problema de accesibilidad real de mi app. El buscador tampoco tenía etiqueta — le puse una.

**Playwright pide Node 20 y la imagen del front se construye con Node 16.** `react-scripts 4` no
compila con OpenSSL 3, así que esa etapa quedó en Node 16 desde el TP2. Lo resolví sacando a
Playwright del build: `npm install --omit=dev`. Es lo correcto por otro motivo además del técnico —
las dos suites **no corren adentro de la imagen**, corren contra el entorno ya desplegado, así que no
tienen por qué viajar en ella.

**El runner se quedó bajando Node y la corrida murió por timeout.** El primer intento de la corrida
roja no llegó a correr un solo test: `actions/setup-node` se puso a bajar Node y un caché de npm de
**1,2 GB a 0,5 MB/s** por mi conexión, y el `timeout-minutes: 15` cortó el job a los 16 minutos.
Lo saqué de los dos jobs: en un runner que es mi propia máquina, bajar Node en cada corrida es tiempo
regalado, porque ya tiene Node 20. En su lugar hay un paso que deja la versión escrita en el log y
corta temprano con un mensaje claro si algún día le cambio el Node a la máquina.

Lo que me dejó el incidente: **el timeout hizo su trabajo**. Sin él, el runner se quedaba ocupado con
una descarga colgada y la cadena entera trabada — el mismo síntoma que el keychain del TP6, que se
colgaba sin fallar nunca. Un job sin tope de tiempo no es un job más paciente: es un job que no sabe
rendirse.

**Y una que no era del pipeline: la caché del navegador.** Después de desplegar el arreglo, el alta
me seguía dando *"El titulo es obligatorio"* en el navegador, con QA ya corriendo la imagen buena.
No era el deploy: el bundle que QA servía tenía el código arreglado (lo comprobé pidiéndole el `.js`
con `curl` y buscando el nombre del campo), y el `POST` por el proxy del front contestaba 200. Lo que
estaba viejo era **mi navegador**: el nombre del bundle cambia en cada build para que el navegador
baje el nuevo, pero el `index.html` que lo referencia se cachea igual. Se arregla con una recarga
forzada, y lo anoto porque es el tipo de falso rojo que te hace dudar del deploy cuando el deploy
está bien — y porque las e2e **no lo sufren**: cada corrida de Playwright abre un contexto limpio,
sin caché. Ése es otro motivo para creerle más a la suite que a mi propia pantalla.

**Los dos mundos de tests podían chocar.** El runner de unitarios y el de Playwright matchean patrones
parecidos de nombres de archivo. Con Vite hay que excluir `e2e/` a mano; verifiqué que con
create-react-app no hace falta, porque su jest sólo mira `src/`. Igual puse `e2e/` en el
`.dockerignore`, para que no entre en el contexto del build.

### Declaración de uso de IA

Usé Claude como ayuda durante el TP7. Me ayudó a entender y resolver los problemas que me
aparecieron, como las e2e que no tenían qué mirar en pantalla, el conflicto de versiones de Node
entre Playwright y la imagen del front, y el job que se colgaba bajando Node hasta que lo cortó el
timeout. Las decisiones del trabajo fueron mías: qué tests incluir en cada suite, la integración
amplia, sacar latest y la regla de un merge por vez. Los resultados los verifiqué yo con los
reportes de las corridas.
