# Decisiones

Un documento por semestre, una sección por práctico.

---

## TP1 — Git colaborativo

### Por qué Git no pudo resolver el conflicto solo

Armé dos ramas, A y B, las dos salidas del mismo commit de `main`, y las dos cambiaron la misma
primera línea del README con un texto distinto. Mergeé A y entró limpia. Cuando abrí el PR de B,
Git ya no tenía forma de decidir: las dos versiones son cambios legítimos sobre la misma línea, y
cuál queda es una decisión de contenido, no algo que se pueda automatizar. Por eso me lo delegó con
los marcadores `<<<<<<<` / `=======` / `>>>>>>>`.

Para que el conflicto nunca hubiera aparecido, tendría que haber creado la rama B **después** de
mergear la A —así habría salido de un `main` que ya tenía el cambio— o directamente no tocar la
misma línea en las dos.

### Por qué proteger `main`

No es desconfianza: es que el proceso no dependa de que nadie se equivoque. Puse *Require a pull
request* con **cero aprobaciones** y *Do not allow bypassing*, así la regla me alcanza a mí, que soy
el dueño del repo. Las cero aprobaciones son porque trabajo solo y GitHub nunca deja aprobar tu
propio PR; en un equipo real ahí iría 1 o más.

### Problemas que encontré

- Al proteger `main` dejé sin querer *Require approvals* en 1. Como soy el único colaborador, no
  podía aprobar mi propio PR y el primero quedó bloqueado con "Review required". Lo puse en 0.
- El repo nació sin README: no tildé la casilla al crearlo. Me di cuenta porque en `git status` el
  archivo aparecía como "sin seguimiento" en vez de "modificado".
- Creé las ramas del conflicto pero me quedé en "Propose changes" sin llegar a "Create pull
  request". Las abrí después con *Compare & pull request*.
- zsh no trata `#` como comentario en modo interactivo, a diferencia de bash. Copié un comando con
  un comentario al final y zsh tomó esas palabras como argumentos de `git push`.

### Corrección posterior

Al consolidar el repositorio encontré dos cosas mal cerradas del TP1:

- `evidencias.md` había entrado a `main` **vacío** en el PR #4. Las cuatro capturas estaban en
  `img/`, pero el archivo que las muestra no tenía contenido: el texto se me quedó sin commitear y
  `git status` no avisa de eso. Lo corregí en el PR #5.
- El tag `v1.0.0` apuntaba a un commit anterior a `decisiones.md` y `evidencias.md`, o sea que
  congelaba un TP1 incompleto. Lo moví con `git tag -f` al commit donde el práctico quedó realmente
  cerrado. Lo dejo escrito porque un tag movido sin avisar rompe la confianza en una release.

### Uso de IA

Usé Claude como guía cuando no sabía cómo seguir, sobre todo con el editor de conflictos: me
explicó qué era cada marcador y que hay que borrarlos a mano. Verifiqué cada paso mirando el
resultado en GitHub antes de avanzar al siguiente.

---

## TP2 — Contenedores

### Por qué esta app

Armé el stack combinando dos repos de bezkoder: backend `node-express-mongodb` y frontend
`react-hooks-crud-web-api`. Contra los criterios de la guía:

- **Buildea y corre local sin drama**, y lo probé antes de comprometerme.
- **Back y front separados**, que es requisito. Descarté una app propia en Next.js justamente por
  esto: al ser SSR mezcla back y front en un mismo proceso y no permite el patrón de dos
  Dockerfiles más proxy nginx.
- **Chica**: un CRUD de Tutorials (título, descripción, publicado). Alcanza para practicar Docker
  sin sumar fricción.
- **La entiendo lo suficiente para modificarla**: de hecho tuve que tocar la conexión a la base y
  la URL de la API para adaptarla a contenedores.

### Por qué dos etapas en cada Dockerfile

Compilar y ejecutar necesitan cosas distintas. La etapa de build trae el compilador y todas las
dependencias de desarrollo; la etapa final sólo copia el resultado sobre una imagen mínima.

- **Frontend**: build con `node:16-alpine` (170 MB, con react-scripts y todo webpack), final con
  `nginx:1.27-alpine` sirviendo los estáticos → 77,9 MB. **Menos de la mitad.** Esa diferencia es
  la prueba de para qué sirve el multi-stage: menos peso y menos superficie de ataque, porque en la
  imagen final no hay compilador.
- **Backend**: acá el ahorro es otro y conviene tenerlo claro. Node necesita su runtime para
  ejecutar, así que la imagen final pesa 236 MB, **más** que su base de 194 MB — no hay binario
  compilado que copiar. Lo que el multi-stage le ahorra son las **dependencias de desarrollo**: la
  etapa final instala con `--omit=dev`.

Usé `node:16` en el frontend, no `node:20`, porque react-scripts 4 trae un webpack incompatible con
OpenSSL 3, que es el que viene desde Node 17. Con Node 20 el build corta con
`error:0308010C:digital envelope routines::unsupported`. Bajar de versión evita el problema sin
tocar el código del proyecto.

El backend corre con `USER node`, no como root: si alguien logra ejecutar algo adentro del
contenedor, lo hace sin privilegios.

### Cómo se encuentran los servicios

Compose crea una red interna con DNS embebido, así que cada contenedor es alcanzable **por el
nombre de su servicio**. El backend no se conecta a una IP ni a `localhost`, se conecta a `db`.

El caso que no es obvio es el frontend. Es una SPA: el JavaScript **corre en el navegador**, que
vive en mi máquina, no dentro de la red de Compose. Por eso el front **no puede** pedirle nada a
`http://backend:8080` — ese nombre no resuelve en el navegador. La solución es que el front llame a
rutas relativas (`/api/...`) y que **nginx** —que sí corre dentro de un contenedor y dentro de la
red— reenvíe esas rutas a `backend:8080`. El `proxy_pass` va sin barra final para no romper el
path: `/api/tutorials` no se convierte en `/tutorials`.

Efecto secundario que vale la pena: como para el navegador todo sale del mismo origen, no hace
falta configurar CORS.

### `healthcheck` vs `depends_on`

No son lo mismo y es la confusión clásica. `depends_on` solo garantiza que el contenedor de Mongo
haya **arrancado**, no que esté listo para aceptar conexiones — y un Mongo recién arrancado tarda
unos segundos más en estar disponible. El backend intentaba conectarse en ese hueco y se moría con
`ECONNREFUSED`.

Se arregla con las dos cosas juntas: un `healthcheck` que pregunta de verdad si la base responde
(`mongosh --eval db.adminCommand('ping')`) y un `depends_on` con `condition: service_healthy`, que
espera a que ese chequeo pase. En el `up` se ve la secuencia: `db Started → db Waiting → db Healthy
→ backend Started`.

### Dónde viven los secretos

En un `.env` que **no se commitea**, con un `.env.example` que sí, con las claves vacías. El
`.gitignore` tiene la línea `.env` y lo verifiqué con `git check-ignore -v .env`.

La consecuencia práctica es que al clonar el repo el `.env` **no está**, y Compose no falla:
reemplaza las variables que faltan por vacío y sigue, hasta que Mongo se niega a arrancar sin
contraseña. Por eso el `cp .env.example .env` es el primer paso del README, no el último.

### Qué persiste y qué no

Los datos de Mongo van a un **volumen nombrado** (`mongo_data`), no al filesystem del contenedor.
Los contenedores son efímeros: si borro el de Mongo, su capa de escritura se pierde. El volumen
sobrevive porque Docker lo administra aparte.

Lo probé: creé un dato, hice `down` y `up`, y seguía ahí; después `down -v` y desapareció. La única
diferencia entre los dos casos es que `-v` se lleva el volumen — los contenedores se destruyen en
ambos.

### Problemas que encontré

- `error:0308010C:digital envelope routines::unsupported` al buildear el frontend con Node 20. Lo
  resolví bajando a Node 16 en la etapa de build.
- `ECONNREFUSED` del backend al arrancar: Docker Desktop estaba instalado pero no abierto.
- La conexión a Mongo estaba hardcodeada a `localhost`, que dentro de un contenedor es el
  contenedor mismo. La saqué a la variable `MONGO_URL`, con un fallback para poder seguir corriendo
  sin Docker.
- Las imágenes en ghcr.io nacen **privadas**. Tuve que cambiarlas a Public a mano desde *Package
  Settings → Danger Zone*, y lo confirmé haciendo `docker pull` sin estar logueado.

### Uso de IA

Los archivos de contenerización (los dos Dockerfiles, `nginx.conf`, `docker-compose.yml`,
`.env.example`) los generó la IA del editor a partir de un prompt con los requisitos técnicos del
práctico. Los errores de Docker los resolví consultando a Claude paso a paso.

No lo di por bueno: verifiqué el multi-stage con `grep -c FROM`, el usuario no root con
`grep USER`, la persistencia con la prueba de `down` / `down -v`, la conexión a la base en los logs
del backend, y el `docker-compose.registry.yml` levantando el stack desde las imágenes publicadas
para confirmar que descarga en vez de construir.

No toqué la lógica de negocio de la app más allá de los dos cambios necesarios para contenerizarla:
leer `MONGO_URL` del entorno en el backend, y usar `REACT_APP_API_URL` en el frontend.

---

## Consolidación del repositorio

El TP2 lo empecé en un repo aparte (`tienda-tp2`). El reglamento pide **un solo repo** para todo el
semestre, con la app entrando al repo del TP1 —el de las protecciones—, porque los prácticos no son
entregables sueltos sino capas sobre el mismo artefacto: el pipeline del TP4 construye estos mismos
Dockerfiles.

Lo uní **mergeando el historial**, no copiando archivos:

    git merge --allow-unrelated-histories tp2/main

El flag hace falta porque los dos repos nacieron por separado y no comparten commit raíz; sin él
Git se niega. La ventaja sobre copiar los archivos es que los commits del TP2 quedan con su fecha
real. Ese PR lo mergeé con **merge commit** en vez de squash justamente por eso: el squash los
habría aplastado en uno solo.

Trajo conflictos en los cuatro archivos que existían en ambos repos (`README.md`, `.gitignore`,
`decisiones.md`, `evidencias.md`), que resolví combinando las dos versiones en vez de elegir una.

**Un hallazgo por el camino**: el commit de documentación del TP2 nunca se había pusheado. En
GitHub faltaban `README.md`, `decisiones.md`, `evidencias.md` y `docker-compose.registry.yml`.
`git status` decía "working tree clean" —porque el commit sí estaba hecho— y nada avisa de que
falta el push. Se ve sólo comparando contra el remoto:

    git log --oneline origin/main..main

Por eso mergeé desde el clon local, que tenía el historial completo. Lo que me llevo: "commiteado"
y "entregado" no son lo mismo.

**Sobre los tags**: `v2.0.0` apunta al commit donde cerré el TP2, no a correcciones posteriores de
la documentación. No lo moví a propósito. `decisiones.md` y `evidencias.md` son acumulativos y
crecen práctico a práctico, así que ningún tag puede contener la versión final de un archivo que
sigue creciendo — `v1.0.0` tampoco tiene las evidencias del TP2. Los tags congelan el **código y la
configuración** de cada práctico; la documentación al día se lee en `main`.

---

## TP3 — Planificación y trazabilidad

Tablero: <https://github.com/users/Josedlpena3/projects/1>

### Duración del sprint: 1 semana

La elegí para que espeje la cadencia real de la materia: una clase por semana, un práctico por
clase. El ciclo de trabajo ya es semanal aunque yo no lo declare. Con dos semanas el sprint
terminaría a mitad de un práctico y la revisión no coincidiría con ninguna entrega.

Lo que gano: al cerrar el sprint, lo que tengo para mostrar es exactamente lo que tengo que
entregar. Lo que pierdo: casi nada de margen si me atraso.

### Límite de trabajo en progreso: 2

La regla de arranque es **personas + 1**. Trabajo solo, así que 2.

El "+1" es la válvula para cuando algo queda esperando algo que no depende de mí —una corrida de CI
de varios minutos, una revisión— y necesito avanzar en otra cosa sin dejar la primera a medias. Con
el límite en 1 me quedaría mirando el pipeline. En 5 dejaría de limitar y vuelvo al problema que el
WIP existe para evitar: empezar mucho y terminar poco. El trabajo empezado y no terminado no es
productividad, es inventario, y el inventario cuesta: más cambio de contexto, más ramas viejas, más
conflictos al integrar.

**Qué me haría subirlo**: sumar gente al equipo. **Qué señal me diría que quedó alto**: no
alcanzarlo nunca. Si el contador jamás se pone en rojo, el límite no está frenando nada.

Y es un acuerdo del equipo, no un candado: GitHub pone la columna en rojo cuando lo paso, pero me
deja pasar igual.

### La historia mal escrita

*"Como desarrollador quiero crear la tabla usuarios para guardar los datos."*

**Por qué está mal**: es una tarea disfrazada de historia. El rol es el propio equipo, y nadie
"quiere" una tabla — la tabla es un medio. El "para" no dice ningún beneficio observable, sólo
repite el qué. Y no es verificable: no hay forma de comprobar que "guardar los datos" esté bien
hecho. De INVEST viola **Valiosa** y **Testeable**.

**Cómo la reescribo**: *"Como usuario registrado quiero que mis datos sigan estando cuando vuelvo a
entrar, para no tener que cargarlos de nuevo"*, con criterios comprobables (los datos sobreviven a
un reinicio; cada usuario ve sólo los suyos). "Crear la tabla" no desaparece: baja a ser una
**tarea** dentro de esa historia, que es el nivel donde siempre perteneció.

### Por qué el bug va al costado

La jerarquía cuenta **lo que planifiqué construir**. Un bug es un defecto de algo **ya construido**,
no era parte del plan. Colgarlo de la historia que lo originó además hace mentir su barra de
progreso, porque esa historia ya está cerrada.

La distinción que importa es *cuándo* aparece el defecto. Si lo encuentro con la historia todavía
en curso, no es un bug: es que la historia no cumple sus criterios de aceptación, y se arregla
adentro. Si aparece sobre algo ya entregado, ahí sí es un bug con issue propio. El principio es uno
solo: **una historia con defectos no está terminada**.

El bug que cargué (#11) es real de mi app: el front pide `GET /api/tutorials` al montar el
componente, pero el `depends_on` del frontend no espera al healthcheck del backend. Si abrís la
página apenas levanta el stack, ves una lista vacía que se confunde con "no hay datos", porque el
`.catch` del axios sólo hace `console.log` y el error nunca llega a la interfaz.

### Por qué los criterios de aceptación son verificables

"Que el CI funcione bien" no es un criterio: no hay forma de pararse frente a la pantalla y decir si
se cumple. Los cuatro que puse sí se contestan con sí o no mirando un lugar concreto: si el
workflow corre en el PR (pestaña Actions), si un test en rojo bloquea el merge (el botón queda
deshabilitado), si el reporte queda como artefacto (está para descargar o no), si el badge está en
el README.

### Trazabilidad

El PR #12 implementa la tarea #9 y la cierra solo con `Closes #9`. El número es el de la **tarea**,
no el de la historia: un PR implementa una tarea concreta. Si hubiera puesto el de la historia, la
habría cerrado con la mitad del trabajo sin hacer.

Por eso la historia #8 y la tarea #10 quedan **abiertas**: el trabajo sigue en el TP4 y el TP5.

### Problemas que encontré

- El Project creado por comando nace **privado** y con el tablero vacío: `gh project create` no
  elige repositorio, así que no queda armado el workflow *Auto-add* que sí configura la creación
  por web. Agregué los issues con `gh project item-add` y lo hice público con `gh project edit`.
- No di la visibilidad por buena mirando la configuración: pedí la URL **sin credenciales** y
  confirmé que devuelve 200. Un Project privado da 404 —ni siquiera "no tenés permiso"— y el
  entregable es la URL.
- `gh` necesita el scope `project`, que no viene de fábrica. Sin él cualquier `gh project` contesta
  error de permisos.
- Dejé tres `gh auth login` abiertos a la vez sin completar ninguno. Cada uno genera un código de un
  solo uso distinto, así que el navegador mostraba un código y la terminal otro: autorizaba y no
  pasaba nada. Lo vi con `pgrep -fl "gh auth"` y porque `~/.config/gh/` no existía, o sea que el
  token nunca se había escrito.

### Uso de IA

Este práctico y el TP4 los hice con **Claude Code, un agente que opera la terminal**. No sólo
redactó: ejecutó los comandos.

**Qué hizo**: instalar y configurar `gh`, crear los labels, los cinco issues y los enlaces de
sub-issues, crear el Project y hacerlo público, y abrir y mergear los Pull Requests.

**Qué decidí yo**: la duración del sprint, el número del límite de WIP, y la configuración del
tablero, que hice a mano desde la web porque la API de GitHub no expone las vistas, el campo
Iteration ni los límites de columna.

**Cómo lo verifiqué**: consultando la API en vez de creer la salida de los comandos. La jerarquía,
pidiendo el árbol de sub-issues; el cierre automático del issue, pidiendo el timeline del #9 y
confirmando que figura cerrado por el PR #12; la visibilidad, con una petición sin credenciales.

---

## TP4 — CI: Pipelines as Code

### Por qué esos jobs y por qué en paralelo

Dos jobs, uno por imagen: `build-backend` y `build-frontend`. Son dos artefactos independientes —
ninguno necesita nada del otro para construirse.

En paralelo porque cada job corre en **su propia máquina limpia** y no comparten filesystem, así que
no hay razón para encadenarlos. Y la diferencia se nota: el frontend tarda bastante más que el
backend (instala react-scripts y empaqueta), y en serie el tiempo total sería la suma de los dos.
En paralelo es el más lento de los dos.

### Por qué construye con mi Dockerfile

Porque si el pipeline compilara por su cuenta con `npm` habría **dos definiciones de build**: la del
YAML y la del Dockerfile. Tarde o temprano divergen, y estaría verificando una compilación distinta
de la que después se despliega.

El efecto lateral bueno es que el workflow no sabe qué hay adentro: no tiene una sola línea de Node.
Ese mismo archivo le sirve a cualquier compañero, sea cual sea su stack.

### Qué se cachea y qué pasa si desaparece

Se cachean **las capas de las imágenes**, en el almacén de GitHub Actions (`type=gha`). Docker
construye en capas y reutiliza las que no cambiaron; por eso el Dockerfile copia primero los
archivos de dependencias y recién después el código, así un cambio de código no invalida la capa que
instala.

Cada job usa su propio `scope`. Sin eso los dos comparten estante y **se pisan**: el último en
terminar deja su cache y borra el del otro, y el síntoma es desconcertante porque un job muestra
`CACHED` y el otro no, y cuál cambia en cada corrida.

Hace falta además `setup-buildx-action`: el constructor que trae Docker de fábrica guarda las capas
en el disco de la máquina y no sabe exportarlas afuera. Como esa máquina se destruye al terminar,
guardarlas ahí no sirve. Si me lo olvido el build **falla** con `Cache export is not supported for
the docker driver`.

**Si el cache desaparece, no pasa nada**: el pipeline funciona igual, sólo más lento. La plataforma
lo desaloja cuando quiere y tiene límite de tamaño, así que tiene que ser así. Si *fallara* sin
cache, no tendría un cache: tendría una dependencia escondida, y eso es un bug.

En mi segunda corrida se reutilizaron 5 capas en el backend y 7 en el frontend.

### El gate

`main` hoy exige **dos** cosas para aceptar un merge: que el cambio entre por Pull Request (TP1) y
que los dos checks estén en verde (TP4). La puerta sin verificación no alcanza, y la verificación
sin puerta tampoco.

`strict: true` agrega que la rama esté **actualizada con `main`** antes de mergear. Sin eso podés
mergear un PR que dio verde contra un `main` viejo, y el resultado combinado puede romper aunque las
dos partes funcionaran por separado.

Los approvals van en **0**: lo que bloquea acá no es una aprobación humana, es el pipeline. Con 1 no
podría mergear nunca, porque GitHub no deja aprobar tu propio PR.

### La demostración

Rompí el build a propósito en el PR #15 con un import a un archivo que no existe.

Lo rompí en el **frontend** y no en el backend, y el motivo importa: el backend es Express **sin
paso de compilación**, su Dockerfile sólo hace `npm install` y `COPY`, nadie ejecuta el código
durante el build. Romper un `.js` del backend daría verde igual. El frontend sí empaqueta con
`react-scripts build` durante el `docker build`, y ahí el bundler resuelve los imports y falla.

Alcanza con un job en rojo para bloquear el merge. Al intentarlo, GitHub contesta: *"the base branch
policy prohibits the merge"*. Después un commit de fix, el pipeline vuelve a correr solo, verde, y
recién ahí mergea.

Dejé abierto un segundo PR (#16) a propósito: es la única forma de ver actuar `strict`. Cuando
mergeé el #15, el #16 quedó desactualizado y apareció el botón *Update branch*. Con un solo PR
abierto eso no se puede mostrar.

### Problemas que encontré

- `backend/package-lock.json` está en el `.gitignore`, así que no viaja al runner. Es justo la
  trampa del "anda en mi máquina y falla en el runner". Acá no rompe porque el Dockerfile copia con
  un glob opcional (`package-lock.json*`), pero lo verifiqué antes de pushear: exporté el repo con
  `git archive` —que es lo mismo que clona el runner— y construí las dos imágenes con `--no-cache`.
- Para ver `CACHED` hacen falta **dos corridas del mismo PR, una después de la otra**. Si pusheás
  las dos seguidas se solapan y la segunda empieza a construir antes de que la primera termine de
  subir su cache. Usé `git commit --allow-empty` para disparar la segunda.
- El cache no se comparte entre ramas: una corrida sólo ve lo que guardó su propia rama y la rama
  base. Como `main` todavía no había guardado nada, la única forma de verlo era que las dos corridas
  fueran del mismo PR.

### Uso de IA

Igual que el TP3: lo hice con Claude Code operando la terminal.

**Qué hizo**: escribir el workflow, configurar la protección de rama con los required status checks,
y abrir y mergear los PRs.

**Qué decidí yo**: romper el frontend y no el backend para la demostración, una vez que entendí que
el backend no compila y daría verde igual.

**Cómo lo verifiqué**: construyendo las dos imágenes en local antes de pushear nada, para no
descubrir el error en el runner; buscando `CACHED` en el log de la segunda corrida; e intentando
mergear el PR roto de verdad, para ver el mensaje del gate en vez de suponerlo.
