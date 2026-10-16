# Postmortem: producción caída 31 horas sin que nadie se enterara — 16/10/2026

> Práctica del TP9 §3.7. No es un incidente simulado: pasó de verdad, y lo escribo
> igual que si hubiera habido usuarios del otro lado.

## Resumen

Los seis contenedores de QA y PROD murieron a la vez con código 137 cuando se cerró Docker
Desktop. Producción estuvo caída **alrededor de 31 horas**. Nadie se enteró: no la detectó
ninguna alerta, la vio una persona que fue a mirar otra cosa.

## Impacto

- **PROD completo**: api, front y base, inalcanzables. Cualquier usuario habría recibido una
  conexión rechazada, no un error con mensaje.
- **QA también**, con lo cual tampoco había dónde probar un arreglo.
- **Los datos sobrevivieron**: viven en volúmenes de Docker, que no se borran cuando el
  contenedor muere. Al levantar, los 6 tutoriales de QA seguían ahí.
- **Duración**: ~31 horas. El dato viene del propio Docker (`Exited (137) 31 hours ago`), así
  que el inicio exacto es aproximado: no hay registro de cuándo se cayó, y eso **también es
  parte del problema**.

## Timeline

| Cuándo | Qué |
|---|---|
| 12/10 ~20:49 | último deploy a PROD antes del incidente (`191d844`) |
| ~15/10, hora desconocida | Docker Desktop se cierra. Los seis contenedores reciben SIGKILL (137) |
| — | **31 horas sin detección.** Nadie pregunta, nada avisa |
| 16/10 ~20:00 | se descubre al ir a verificar otra cosa, para el TP9 |
| 16/10 ~20:02 | diagnóstico: `docker ps -a` muestra los seis en `Exited (137)` |
| 16/10 ~20:05 | mitigación: `docker start` de las bases, después de las apis y los fronts |
| 16/10 ~20:06 | **restaurado**. QA con sus 6 tutoriales, PROD respondiendo |

**Detección: 31 horas. Restauración: 2 minutos.**

## Causa raíz

No es "alguien cerró Docker Desktop". Eso es el disparador, y va a volver a pasar: una
notebook se apaga, se reinicia, se queda sin batería.

La causa raíz es que **producción depende de un proceso de escritorio que nadie supervisa, y
no hay nada que avise cuando deja de estar**. Dos huecos del sistema, no de una persona:

1. **`restart: unless-stopped` no cubre este caso.** Esa política hace que Docker reinicie un
   contenedor que se cae — pero si quien se cae es **el daemon entero**, no queda nadie para
   reiniciar a nadie. La política protege contra un proceso que crashea, no contra el piso
   que desaparece.
2. **No había ningún observador externo.** El sistema sólo podía reportar que estaba vivo
   mientras estuviera vivo. Es la definición del problema que el TP9 viene a resolver: quien
   pregunta tiene que estar **afuera**.

## Acciones

| Qué | Por qué | Dueño |
|---|---|---|
| Monitor externo sobre el `/health` de PROD, con alerta por mail | es exactamente este hueco: 31 horas se habrían convertido en 5 minutos | TP9, tarea 4 |
| Que Docker Desktop arranque con la sesión | el disparador vuelve; que el piso se reponga solo | pendiente |
| Anotar que el runner tampoco sobrevive a un reinicio | si la máquina se reinicia, además de PROD se cae la capacidad de desplegar el arreglo | ya en `decisiones.md` |

## Aprendizajes

**El tiempo de restauración no era el problema.** Dos minutos para levantarlo; 31 horas para
enterarse. Toda la mejora posible está del lado de la detección, y antes de este incidente yo
habría dicho lo contrario.

**Un sistema no puede avisar que se murió.** Suena obvio escrito, pero mi `/health` era toda
mi observabilidad, y un endpoint sólo contesta mientras el proceso que lo sirve esté vivo. Por
eso el monitor va afuera: no comparte el destino de lo que vigila.

**Sin registro, no hay hora de inicio.** No puedo decir cuándo empezó la caída, sólo
aproximarla por lo que Docker recuerda. Un incidente que no deja rastro tampoco se puede
medir después, y lo que no se mide no se mejora.

**Los datos aguantaron, y eso fue diseño, no suerte.** Los volúmenes nombrados del TP2 son la
razón de que al levantar estuviera todo. Una decisión de hace siete prácticos pagando sola.
