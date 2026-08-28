# Evidencias — TP1

## 1. Push directo a main rechazado
![push rechazado](img/TP1_evidencia1.png)
GitHub rechaza el push porque main está protegida y la regla alcanza también al dueño del repo.

## 2. El PR de la rama B no se puede mergear: conflicto
![aviso de conflicto](img/TP1_evidencia2.png)
Ambas ramas modificaron la misma línea del README, así que GitHub no puede fusionar automáticamente.

## 3. Marcadores de conflicto en el editor de GitHub
![marcadores](img/TP1_evidencia3.png)
Arriba de `=======` está la versión de la rama que se está mergeando (B); abajo, la que ya estaba en main (A).

## 4. Release v1.0.0 publicada
![release](img/TP1_evidencia4.png)
Primera versión estable del TP, tagueada con semver sobre main.


