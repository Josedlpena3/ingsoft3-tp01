# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Cuando armé las ramas A y B, las dos salieron del mismo commit de main.
las dos cambiaban la misma primera línea del README, cada una con un texto distinto. Git no sabe cuál de las dos versiones quiero que quede, así que me pregunta que decision quiero tomar.

Cuando abrí el editor de conflictos me encontré con los marcadores `<<<<<<<`, `=======` y `>>>>>>>` y no sabia que hacer, así que le pregunté a la IA que tenia que hacer. Me explicó que arriba de las `=======` está mi versión y abajo la que ya estaba en
main, y que hay que borrar las tres líneas de marcadores a mano y dejar solo el contenido final.

Para que el conflicto nunca hubiera aparecido, tendría que haber creado la rama B recién después de mergear la A, o directamente no tocar la misma línea en las dos.

## 2. Problemas que encontré y cómo los solucioné
- Al proteger `main` dejé sin querer tildado "Require approvals" en 1, y como soy el único colaborador nunca podía aprobar mi propio PR. Lo destildé en Settings → Branches.
- Creé las ramas del conflicto pero me olvidé de terminar de abrir los PRs. Los abrí después con "Compare & pull request".

## 3. Declaración de uso de IA

Usé Claude como guía en el TP cuando no sabia hacer algo, especialmente cuando abrí el editor de conflictos.