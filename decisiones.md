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
