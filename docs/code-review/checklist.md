# Checklist de code review

Se aplicó sobre el commit `04662db` (tag `etapa-pruebas`), es decir, sobre el
código ya refactorizado y probado, antes de darlo por terminado. Cada ítem
`No` o `Parcial` generó una observación en [revision.md](revision.md).

**Criterio de aceptación de la revisión:** ningún ítem de severidad alta puede
quedar en `No`; los de severidad media o baja pueden quedar pendientes solo si
la decisión está justificada por escrito.

## Diseño y SOLID

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| D1 | Cada clase tiene una sola razón para cambiar (SRP) | Sí | Controlador, servicios, entidad, repositorios y filtro separados |
| D2 | Agregar un tipo o un estado no obliga a modificar código existente (OCP) | Sí | Tablas `TIPOS_DE_SOLICITUD` y `TRANSICIONES` |
| D3 | Las implementaciones de un puerto se pueden intercambiar (LSP) | Sí | Repositorio JSON y en memoria pasan los mismos tests de servicios |
| D4 | Ningún cliente depende de métodos que no usa (ISP) | Sí | `ReporteService` depende de `LectorSolicitudes` |
| D5 | Las reglas dependen de abstracciones, no de la infraestructura (DIP) | Sí | Servicios sin `fs` ni `new Date()` |
| D6 | Los datos persistidos inválidos se detectan con un error claro | **No** | Un tipo desconocido daba `TypeError` (CR6) o `NaN` en el reporte (CR5) |

## Clean Code

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| C1 | Nombres que revelan intención, sin abreviaturas de una letra | Sí | `q`, `b`, `p` reemplazados en el refactoring |
| C2 | Métodos cortos, de un solo nivel de abstracción | Sí | El más largo tiene 16 líneas |
| C3 | Sin números ni textos mágicos | Sí | Constantes en `reglas.ts`, enums de dominio |
| C4 | Sin código duplicado | Sí | Una sola lectura de archivo, una sola validación de largo |
| C5 | Sin comentarios que reemplacen nombres | Sí | Los comentarios explican el *porqué*, no el *qué* |
| C6 | Tipos explícitos en las entradas | **Parcial** | El cuerpo del alta llega como `any` (CR2) |
| C7 | Comparaciones estrictas (`===`) | **Parcial** | `cuerpo.urgente == true` (CR10) |
| C8 | Formato uniforme verificado por una herramienta | **No** | No hay linter ni formateador configurado (CR4) |

## Manejo de errores

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| E1 | No se tragan excepciones | Sí | Los `catch` vacíos se eliminaron en el refactoring 1 |
| E2 | Los errores responden con el código HTTP que corresponde | **No** | Responden `200`/`201` con el error en el cuerpo (CR1). **Severidad alta** |
| E3 | Los errores del usuario se distinguen de las fallas internas | **Parcial** | Todo error de negocio se trataba igual (CR1) |
| E4 | Un estado inválido no queda a medio guardar | Sí | Probado en `dominio.spec.ts` |

## Pruebas

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| P1 | Toda regla de negocio tiene al menos un test | Sí | 83 pruebas, 100 % de líneas |
| P2 | Se prueban los dos lados de cada límite | Sí | Cupo de 4 y 5, vencimiento en el instante exacto |
| P3 | Las pruebas no dependen del entorno (disco real, hora real) | **Parcial** | La caracterización respalda y restaura `./data` y falsea el reloj global (CR9) |
| P4 | Las pruebas corren rápido y en cualquier orden | Sí | Unos 2 segundos |

## Seguridad y datos

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| S1 | Sin credenciales ni secretos en el repositorio | Sí | |
| S2 | Datos personales sintéticos | Sí | Nombres y legajos inventados |
| S3 | Escrituras seguras ante pedidos simultáneos | **No** | Dos altas a la vez pueden pisarse (CR3) |

## Repositorio y documentación

| # | Ítem | Resultado | Observación |
|---|---|---|---|
| R1 | Tags de cada etapa en su commit | Sí | `estado-inicial`, `etapa-diagnostico`, `etapa-refactoring`, `etapa-pruebas` |
| R2 | Commits chicos, con mensaje que explica el porqué | Sí | Un commit por refactoring |
| R3 | README con descripción, instalación, uso, funcionalidades y tecnologías | **No** | Tiene tres líneas (CR7) |
| R4 | Decisiones técnicas documentadas | Sí | `docs/diagnostico.md`, `refactorings.md`, `pruebas.md` |
