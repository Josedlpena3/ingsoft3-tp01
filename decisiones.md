# Decisiones

Documento acumulativo de la cursada: cada TP agrega su sección al final, sin pisar las anteriores.

---

## TP1 — Git colaborativo

### 1. Por qué Git no pudo resolver el conflicto solo

Cuando armé las ramas A y B, las dos salieron del mismo commit de main.
las dos cambiaban la misma primera línea del README, cada una con un texto distinto. Git no sabe cuál de las dos versiones quiero que quede, así que me pregunta que decision quiero tomar.

Cuando abrí el editor de conflictos me encontré con los marcadores `<<<<<<<`, `=======` y `>>>>>>>` y no sabia que hacer, así que le pregunté a la IA que tenia que hacer. Me explicó que arriba de las `=======` está mi versión y abajo la que ya estaba en
main, y que hay que borrar las tres líneas de marcadores a mano y dejar solo el contenido final.

Para que el conflicto nunca hubiera aparecido, tendría que haber creado la rama B recién después de mergear la A, o directamente no tocar la misma línea en las dos.

### 2. Problemas que encontré y cómo los solucioné
- Al proteger `main` dejé sin querer tildado "Require approvals" en 1, y como soy el único colaborador nunca podía aprobar mi propio PR. Lo destildé en Settings → Branches.
- Creé las ramas del conflicto pero me olvidé de terminar de abrir los PRs. Los abrí después con "Compare & pull request".

### 3. Declaración de uso de IA

Usé Claude como guía en el TP cuando no sabia hacer algo, especialmente cuando abrí el editor de conflictos.

### 4. Corrección posterior: el tag `v1.0.0` se movió

Al consolidar el repo del semestre detecté dos cosas del TP1 que habían quedado mal cerradas:

- `evidencias.md` había entrado a `main` en el PR #4 **vacío** (0 bytes). Las cuatro capturas
  estaban en `img/`, pero el archivo que las referencia no tenía contenido: el texto se me quedó
  en el working tree sin commitear. Se corrigió por PR aparte.
- El tag `v1.0.0` apuntaba a un commit **anterior** a `decisiones.md` y `evidencias.md`, así que
  congelaba un estado incompleto del TP1.

Como el reglamento (§3) contempla explícitamente mover un tag ya publicado, se movió con
`git tag -f v1.0.0 && git push -f origin v1.0.0` al commit donde el TP1 quedó realmente cerrado.
Se documenta acá porque un tag movido sin avisar es exactamente el tipo de cosa que rompe la
confianza en una release.

---

## TP2 — Contenedores

### 1. Eleccion de la app del semestre

Se eligio armar un stack propio combinando dos repos tutorial de bezkoder:
- Backend: node-express-mongodb (Node.js + Express + Mongoose)
- Frontend: react-hooks-crud-web-api (React con Hooks, sin Redux, Axios)

Motivos, segun los criterios de la guia:
- Buildea y corre local sin complicaciones: se probo ANTES de comprometerse con esta opcion.
- Backend y frontend estan separados en servicios distintos (requisito del TP), a diferencia
  de una alternativa que se descarto antes (una app propia en Next.js, que al ser SSR mezcla
  back y front en un mismo proceso y no permite el patron de Dockerfiles separados + proxy nginx).
- Tamano acotado: es un CRUD simple (Tutorials: titulo, descripcion, publicado), sin pantallas
  ni features de mas. Alcanza para practicar Docker sin sumar friccion innecesaria.
- Se entiende el codigo lo suficiente como para modificarlo (se modificaron config de conexion
  a la base y la URL de la API para adaptarlo a contenedores).

### 2. Decisiones tecnicas de containerizacion

#### Backend (multi-stage)
- Imagen base: node:20-alpine, tanto en la etapa de build como en la de runtime.
- Se instalan solo dependencias de produccion en la imagen final (--omit=dev).
- El contenedor corre con usuario no root (USER node), no como root por defecto.
- La conexion a MongoDB se lee de la variable de entorno MONGO_URL (antes estaba hardcodeada
  a mongodb://0.0.0.0:27017/bezkoder_db, lo cual no funciona en contenedores separados).

#### Frontend (multi-stage)
- Etapa de build: node:16-alpine (en vez de node:20-alpine).
  Motivo: el proyecto usa react-scripts con Webpack 4 (version vieja), que no es compatible
  con OpenSSL 3, la version que trae Node desde la 17 en adelante. Al buildear con Node 20
  aparece el error "error:0308010C:digital envelope routines::unsupported". Usar Node 16 evita
  el problema sin tener que tocar el codigo del proyecto ni sus dependencias.
- Etapa final: nginx:1.27-alpine, sirviendo los archivos estaticos generados por el build.

#### Proxy reverso de nginx
El frontend (React) corre en el navegador del usuario, fuera de la red interna de Docker. Por
eso no puede pedirle nada directamente a "http://backend:8080" (ese nombre solo resuelve DENTRO
de la red de contenedores). La solucion: el frontend llama a rutas relativas ("/api/..."), y
nginx -que si corre dentro del contenedor y de la red interna- redirige esas rutas al servicio
backend por su nombre de servicio (backend:8080), usando el DNS interno de Docker
(resolver 127.0.0.11). El proxy_pass se escribe sin barra final para no romper el path
("/api/tutorials" no se convierte en "/tutorials").

Con este patron, ademas, no hace falta configurar CORS: para el navegador todo sale del mismo
origen (el propio nginx).

#### Persistencia
Los datos de MongoDB se guardan en un volumen nombrado (mongo_data), no en el filesystem del
contenedor. Esto es necesario porque los contenedores son efimeros: si se borra el contenedor
de Mongo, su capa de escritura se pierde, pero el volumen sobrevive porque Docker lo administra
aparte. Se verifico esto de forma practica: se creo un dato de prueba, se hizo
"docker compose down" + "up" y el dato seguia estando; despues se hizo "down -v" y el dato
desaparecio (el volumen se borro).

#### depends_on + healthcheck
"depends_on" solo garantiza que el contenedor de Mongo haya ARRANCADO, no que este LISTO para
aceptar conexiones. Por eso se agrego un healthcheck ("mongosh --eval db.adminCommand('ping')")
y se uso "depends_on: condition: service_healthy" en el backend, para que espere a que Mongo
este realmente disponible antes de intentar conectarse.

### 3. Problemas encontrados y como se resolvieron

- Error "digital envelope routines::unsupported" al correr el frontend con Node 20: se resolvio
  usando Node 16 en la etapa de build (ver arriba).
- Error "ECONNREFUSED" del backend al arrancar: Docker Desktop no estaba corriendo (estaba
  instalado pero no abierto). Se resolvio abriendo la aplicacion manualmente antes de correr
  comandos docker.
- Conexion a MongoDB hardcodeada a localhost: no funciona en contenedores separados porque cada
  uno tiene su propio localhost. Se resolvio externalizando la URL a la variable de entorno
  MONGO_URL, con un fallback para poder seguir corriendo local sin Docker.
- Imagenes publicadas en ghcr.io nacen privadas por defecto: se cambio la visibilidad a Public
  manualmente desde Package Settings > Danger Zone > Change visibility, y se confirmo con un
  "docker pull" sin estar logueado.

### 4. Declaracion de uso de IA

Se uso IA (Claude, via chat, y la IA integrada del editor) durante el desarrollo del TP, de la
siguiente manera:

- Explicaciones conceptuales y troubleshooting paso a paso (errores de Docker Desktop, error de
  OpenSSL, ECONNREFUSED de Mongo) se resolvieron con ayuda de Claude, verificando cada paso con
  el resultado real de los comandos antes de avanzar al siguiente.
- Los archivos de containerizacion (backend/Dockerfile, frontend/Dockerfile, frontend/nginx.conf,
  docker-compose.yml, .env.example, .gitignore) fueron generados por la IA integrada del editor,
  a partir de un prompt detallado con los requisitos tecnicos del TP (multi-stage, healthcheck,
  volumen nombrado, proxy reverso, no root, etc).
- Verificacion: cada archivo generado se reviso manualmente contra la guia del TP (multi-stage
  confirmado con "grep FROM", usuario no root confirmado con "grep USER", persistencia probada
  con down/up y down -v, conexion a la base verificada en los logs del backend). El
  docker-compose.registry.yml se probo levantando el stack desde las imagenes publicadas en
  ghcr.io (no desde build local), confirmando que descarga en vez de construir.
- No se modifico la logica de negocio de la app (controllers, models, rutas, componentes React)
  mas alla de los dos cambios estrictamente necesarios para adaptarla a contenedores: la lectura
  de MONGO_URL por variable de entorno en el backend, y el uso de REACT_APP_API_URL en el
  frontend.

### 5. Consolidación en un solo repositorio

El TP2 se desarrolló al principio en un repositorio aparte (`tienda-tp2`). El reglamento de la
materia (§3) pide **un solo repo para todo el semestre**, con la app entrando al repo del TP1 —el
de las protecciones—, porque los TPs no son entregables sueltos sino capas sobre el mismo
artefacto: el pipeline del TP4 corre sobre estos mismos Dockerfiles.

La unificación se hizo **mergeando el historial**, no copiando archivos:

    git remote add tp2 /ruta/local/a/tienda-tp2   # el clon local, no el remoto: ver más abajo
    git fetch tp2
    git merge --allow-unrelated-histories tp2/main

`--allow-unrelated-histories` hace falta porque los dos repos nacieron por separado y no comparten
ningún commit raíz; sin ese flag git se niega a mergear. La ventaja de hacerlo así en vez de copiar
los archivos es que los commits del TP2 quedan en el historial del repo del semestre con su fecha
real. Ese PR se mergeó con **merge commit** en vez de squash justamente por eso: el squash los
habría aplastado en uno solo y habría perdido lo que queríamos conservar.

El merge trajo conflictos en los cuatro archivos que existían en ambos repos (`README.md`,
`.gitignore`, `decisiones.md`, `evidencias.md`), resueltos combinando ambas versiones en vez de
elegir una.

#### El commit del TP2 que nunca había llegado a GitHub

Al hacer el `git fetch` desde `https://github.com/Josedlpena3/tienda-tp2.git` aparecieron **dos**
commits, no tres: faltaba `d6563fd`, el de la documentación. Comparando `main` local contra
`origin/main` en aquel repo se confirmó que ese commit **nunca se había pusheado**, y con él nunca
llegaron a GitHub cuatro entregables del TP2: `README.md`, `decisiones.md`, `evidencias.md` y
`docker-compose.registry.yml`. Existían sólo en mi disco, así que quien hubiera abierto el
repositorio no habría visto ninguno.

Cómo se detectó, y por qué es fácil que pase: `git status` decía "working tree clean" —porque el
commit **sí** estaba hecho— y nada en la terminal avisa de que falta el push. La diferencia sólo
se ve comparando contra el remoto:

    git log --oneline origin/main..main     # commits locales que el remoto no tiene

Se resolvió mergeando desde el **clon local** (`git remote set-url tp2 <ruta local>`), que sí tiene
el historial completo, en vez de desde el remoto incompleto. El commit entra así al repo del
semestre con su fecha y su autoría originales. La lección que me llevo es que "commiteado" y
"entregado" no son lo mismo, y que la única verificación que vale es abrir el repositorio en el
navegador — es la misma idea que el TP3 aplica al Project (probarlo en una ventana de incógnito).

---

## TP3 — Planificación y trazabilidad

Tablero: <https://github.com/users/Josedlpena3/projects/1> (público)

### 1. Duración del sprint: 1 semana

La elegí para que **espeje la cadencia real de la materia**: hay una clase por semana y un TP por
clase, así que el ciclo de trabajo ya es semanal aunque yo no lo declare. Un sprint de dos semanas
me obligaría a planificar contra un calendario que no es el que realmente rige — el sprint
terminaría a mitad de un TP y la revisión no coincidiría con ninguna entrega.

Lo que gano con que coincidan: al cerrar el sprint, lo que hay para mostrar es exactamente lo que
tengo que entregar. Lo que pierdo: casi nada de margen si me atraso, porque no hay una segunda
semana adentro del mismo sprint para recuperar.

### 2. Límite de trabajo en progreso: 2

La regla de arranque es **cantidad de personas + 1**. Trabajo solo, así que dos.

El "+1" no es decoración: es la válvula para cuando algo queda **esperando algo que no depende de
mí** —una corrida de CI de varios minutos, una revisión, una respuesta— y necesito avanzar en otra
cosa sin dejar la primera a medias. Con el límite en 1 me quedaría mirando el pipeline; con el
límite en 5 dejaría de limitar y volvería al problema que el WIP existe para evitar: empezar mucho
y terminar poco. El trabajo empezado y no terminado no es productividad, es **inventario**, y el
inventario cuesta — más cambio de contexto, más ramas viejas, más conflictos al integrar.

**Qué me haría subirlo**: sumar una persona al equipo (pasaría a 3). **Qué señal me diría que quedó
demasiado alto**: no alcanzarlo nunca. Si el contador jamás se pone en rojo, el límite no me está
diciendo nada — no está haciendo de freno, es un número decorativo.

Vale aclarar algo que se presta a confusión: el límite es un **acuerdo del equipo**, no un candado
de la herramienta. GitHub pone el contador de la columna en rojo cuando lo pasás, pero te deja
pasar igual.

### 3. Diagnóstico de la historia mal escrita

La historia del ejercicio: *"Como desarrollador quiero crear la tabla usuarios para guardar los
datos"*.

**Por qué está mal**: es una **tarea disfrazada de historia**. El rol es el propio equipo, no
alguien a quien el sistema le sirva para algo — nadie "quiere" una tabla, la tabla es un medio. El
"para" no expresa un beneficio observable por nadie, sólo repite el qué con otras palabras. Y no es
verificable: no hay forma de comprobar que "guardar los datos" esté bien hecho sin inventar los
criterios que la historia no da. De INVEST viola **Valiosa** (nadie fuera del equipo la quiere) y
**Testeable** (no se puede demostrar terminada).

**Cómo la reescribiría**: *"Como usuario registrado quiero que mis datos sigan estando cuando vuelvo
a entrar, para no tener que cargarlos de nuevo cada vez"*, con criterios verificables (los datos
sobreviven a un reinicio del sistema; un usuario ve sólo los suyos). "Crear la tabla usuarios" no
desaparece: baja a ser una **tarea** dentro de esa historia, que es el nivel donde siempre
perteneció.

### 4. Por qué el bug va al costado y no colgando de la historia

La jerarquía cuenta **lo que planifiqué construir**: la épica es el objetivo, las historias el valor
a entregar, las tareas los pasos. Un bug es un defecto de algo **ya construido** — no era parte del
plan, así que no forma parte del árbol. Colgarlo de la historia que lo originó tiene además un
efecto feo: esa historia ya está cerrada, y su barra de progreso pasaría a mentir.

La distinción que importa es **cuándo aparece el defecto**:

| Cuándo | Qué es | Dónde va |
|---|---|---|
| Con la historia **en curso**, antes de cerrarla | No es un bug: la historia todavía no cumple sus criterios | Se arregla dentro de la historia, sin issue aparte |
| Sobre algo **ya entregado** | Bug de verdad | Issue propio con label `bug`, al costado |

El principio detrás de las dos filas es uno solo: **una historia con defectos no está terminada**.
Si lo encontré antes de cerrarla, no descubrí un bug — descubrí que me faltaba trabajo.

El bug que cargué (#11) es del segundo caso y es real de mi app: el frontend pide `GET
/api/tutorials` al montar el componente, pero el `depends_on` del frontend no espera al healthcheck
del backend. Si abrís la página apenas levanta el stack, ves una lista vacía que se confunde con
"no hay datos", porque el `.catch` del axios sólo hace `console.log` y el error nunca llega a la
interfaz.

### 5. Por qué cada criterio de aceptación de la historia es verificable

Es lo que separa un criterio de una intención. "Que el CI funcione bien" no es criterio: no hay
forma de pararse frente a la pantalla y decir si se cumple o no. Los cuatro que puse sí:

| Criterio | Cómo lo verifico |
|---|---|
| El workflow corre en cada PR a main | Abro un PR y miro la pestaña *Actions*: o hay una corrida asociada, o no la hay |
| Un test que falla bloquea el merge | Rompo algo a propósito y miro si el botón de merge queda deshabilitado (es la demostración del TP4) |
| El reporte de tests queda publicado como artefacto | Entro a la corrida y miro si el artefacto está para descargar |
| Badge de estado visible en el README | Abro el README y el badge está, o no está |

Los cuatro se contestan con sí o no mirando un lugar concreto. Ninguno depende de mi opinión.

### 6. Problemas encontrados y cómo los resolví

- **El Project creado por comando nace privado y con el tablero vacío.** `gh project create` no
  elige ningún repositorio, así que no queda configurado el workflow *Auto-add to project* que sí
  arma la creación por web. Resultado: los issues no entran solos. Lo resolví agregándolos con
  `gh project item-add`, y cambiando la visibilidad con
  `gh project edit 1 --owner "@me" --visibility PUBLIC`.
- **La visibilidad no la di por buena mirando la configuración.** El entregable es la URL, y un
  Project privado da 404 —no "no tenés permiso": "no existe"—, así que lo verifiqué pidiendo la URL
  **sin credenciales** y confirmando que devuelve HTTP 200. Es el equivalente a la ventana de
  incógnito.
- **`gh` necesita el scope `project`, que no viene de fábrica.** Sin él, cualquier `gh project`
  contesta un error de permisos. Se agrega al autenticar: `--scopes "project,workflow"` (el
  `workflow` hace falta aparte para poder pushear archivos dentro de `.github/workflows/`).
- **Tres `gh auth login` abiertos a la vez.** Al no completar el primer intento lo volví a correr, y
  terminé con tres procesos vivos. Cada uno genera **un código de un solo uso distinto**, así que la
  página del navegador correspondía a un código y la terminal mostraba otro: autorizaba y no pasaba
  nada. Lo detecté con `pgrep -fl "gh auth"` y porque `~/.config/gh/` no existía, o sea que el token
  nunca se había escrito. Se resolvió con `pkill -f "gh auth login"` y un único intento limpio.
- **El `Closes #N` va con el número de la TAREA, no el de la historia.** Un Pull Request implementa
  una tarea concreta. Si hubiera puesto el número de la historia, la habría cerrado con la mitad del
  trabajo sin hacer y la trazabilidad quedaría mintiendo. Por eso el PR #12 cierra la tarea #9, y la
  historia #8 y la tarea #10 quedan **abiertas** — el trabajo sigue en el TP4 y el TP5.

### 7. Declaración de uso de IA

Este práctico se hizo **con un agente de IA (Claude, vía Claude Code) operando la terminal**, no
sólo redactando. El reglamento (§6) es explícito en que la vara es la misma para la IA que opera que
para la que escribe, así que lo declaro con ese detalle:

**Qué hizo la IA**: instalar y configurar `gh`; crear los labels, los cinco issues y los enlaces de
sub-issues; crear el Project y hacerlo público; abrir y mergear los Pull Requests; y redactar este
documento.

**Qué decidí yo**: la duración del sprint, el número del límite de trabajo en progreso, y qué app
del semestre usar (eso venía del TP2).

**Cómo lo verifiqué**: no dando por buena ninguna salida de comando. La jerarquía se comprobó
consultando la API de GitHub y viendo el árbol épica → historia → dos tareas; el cierre automático
del issue se comprobó pidiendo el timeline del issue #9 y confirmando que figura *cerrado por el PR
#12*; la visibilidad del Project, con una petición sin credenciales que devolvió HTTP 200; y que la
historia y la segunda tarea siguen abiertas, consultando su estado.

**Lo que la IA encontró y yo no sabía**: que `evidencias.md` había entrado vacío a `main` en el TP1,
que el tag `v1.0.0` apuntaba a un commit anterior a la documentación, y que el commit de
documentación del TP2 nunca se había pusheado. Los tres están explicados arriba, en las secciones
que corresponden.
