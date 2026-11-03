# Registro de la revisión de código

Observaciones que surgieron del [checklist](checklist.md). Para cada una: dónde
está, el feedback tal como se lo daríamos a un compañero, qué se hizo y con qué
criterio se acepta.

**Severidad.** *Alta*: un defecto visible para quien usa la API. *Media*: un
riesgo real que todavía no se manifestó. *Baja*: afecta la lectura o la
consistencia.

## Resumen

| ID | Severidad | Observación | Estado |
|---|---|---|---|
| CR1 | Alta | Los errores responden 200/201 | Corregida |
| CR5 | Media | Un tipo desconocido rompe el reporte con `NaN` | Corregida |
| CR6 | Media | Un tipo desconocido da un `TypeError` sin contexto | Corregida |
| CR9 | Media | La caracterización depende de los datos reales y del reloj global | Corregida |
| CR3 | Media | Escrituras concurrentes sobre el JSON | Pendiente, justificada |
| CR2 | Baja | El cuerpo del alta llega como `any` | Pendiente, justificada |
| CR4 | Baja | Sin linter ni formateador | Pendiente, justificada |
| CR10 | Baja | Comparación no estricta en `urgente` | Aceptada como está |
| CR7 | Baja | README incompleto | Pasa a la etapa de documentación |

Ningún ítem de severidad alta quedó abierto: la revisión cumple su criterio de
aceptación.

---

## CR1 · Los errores responden con código de éxito · Alta · Corregida

**Dónde:** `src/solicitudes/errores-de-negocio.filter.ts`.

**Feedback.** "El filtro devuelve `200` (o `201` en un alta) cuando la operación
falló. Un frontend que mira el código HTTP va a mostrar 'Solicitud creada'
aunque no se haya creado nada. Propongo distinguir tres casos: el recurso de la
URL no existe (`404`), los datos que mandó el cliente están mal (`400`) y una
regla de negocio impide la operación aunque los datos estén bien (`409`)."

**Qué se hizo.** Dos subclases de `ErrorDeNegocio` (`DatosInvalidos` y
`RecursoNoEncontrado`), cada `throw` usa la que corresponde y el filtro elige el
código en una función, `codigoPara`. Como el refactoring 5 había dejado la
traducción en un solo lugar, el cambio fue de un archivo más la clasificación
de cada error.

| Situación | Antes | Ahora |
|---|---|---|
| La solicitud de la URL no existe | 200 | 404 |
| Falta un dato, tipo inválido, texto corto, estudiante o responsable inexistente | 200/201 | 400 |
| Solicitud cerrada, transición inválida, sin responsable, otra área, cupo lleno, estudiante libre, responsable inactivo | 200/201 | 409 |

**Es un cambio de comportamiento a propósito.** Los tests de caracterización
que decían `DEFECTO REGISTRADO` ahora esperan el código nuevo y están marcados
`CR1`. La comparación antes/después sigue usando los tests de
`etapa-diagnostico`, que eran el contrato del refactoring.

**Criterio de aceptación.** Todas las respuestas de error tienen un código
4xx; los tests de caracterización y `revision.spec.ts` lo verifican.

## CR5 · El reporte devuelve `NaN` con un tipo desconocido · Media · Corregida

**Dónde:** `ReporteService.contar`.

**Feedback.** "Si en el archivo aparece un tipo que no está en la tabla (lo
cargó alguien a mano, o se quitó un tipo que tenía solicitudes), `conteo[valor]++`
sobre una clave inexistente da `NaN` y el reporte muestra basura sin avisar."

**Qué se hizo.** El conteo arranca en cero para cualquier clave:
`conteo[valor] = (conteo[valor] ?? 0) + 1`. El tipo desconocido aparece contado
aparte, que es más útil para detectar el problema que esconderlo.

**Criterio de aceptación.** Prueba en `revision.spec.ts`.

## CR6 · Un tipo desconocido da un error sin contexto · Media · Corregida

**Dónde:** `SolicitudesService.asignarResponsable`, que hacía
`buscarTipo(solicitud.tipo).area`.

**Feedback.** "Si `buscarTipo` no encuentra el tipo, esto explota con
`Cannot read properties of undefined` y nadie sabe por qué. Además, no es un
error del usuario: son datos corruptos, y no debería responder como si lo
fuera."

**Qué se hizo.** `Solicitud.tipoDeSolicitud()` lanza un `Error` común (no un
`ErrorDeNegocio`) con el tipo que falló. Al no ser de negocio, NestJS responde
`500`, que es lo correcto para una falla interna.

**Criterio de aceptación.** Prueba en `revision.spec.ts`: el mensaje nombra el
tipo y el error no es de negocio.

## CR9 · La caracterización depende del entorno · Media · Corregida

**Dónde:** `test/caracterizacion.e2e.spec.ts`.

**Feedback.** "El test respalda la carpeta `./data` real, escribe sobre ella y la
restaura. Si el proceso se corta a la mitad, quedan los datos modificados. Y
falsea `Date` para todo el proceso. Eso tenía sentido en la versión inicial, que
no dejaba otra opción; ahora el sistema permite inyectar la carpeta y el reloj."

**Qué se hizo.** Cada test copia los datos de ejemplo a una carpeta temporal y
la inyecta con `overrideProvider(DIRECTORIO_DATOS)`; el reloj se reemplaza con
`overrideProvider(Reloj)`. Se eliminaron el respaldo y los temporizadores
falsos.

**Criterio de aceptación.** Los tests no modifican `./data` (verificado con
`git status` después de correrlos).

## CR3 · Escrituras concurrentes · Media · Pendiente, justificada

**Dónde:** `RepositorioSolicitudesJson.guardar` y `siguienteId`.

**Feedback.** "Dos altas simultáneas leen el mismo archivo, calculan el mismo
id y la segunda pisa a la primera."

**Por qué queda pendiente.** Resolverlo con archivos exige un bloqueo entre
procesos, que es justamente lo que da una base de datos. El alcance del trabajo
es la calidad interna, no la escala, y gracias a DIP el cambio a una base de
datos es reemplazar una sola clase (`RepositorioSolicitudesJson`) sin tocar los
servicios.

**Criterio para retomarlo.** Antes de que el sistema tenga más de un usuario
escribiendo a la vez.

## CR2 · El cuerpo del alta llega como `any` · Baja · Pendiente, justificada

**Dónde:** `SolicitudesController.registrar`.

**Feedback.** "Lo idiomático en NestJS es una clase DTO con `class-validator` y
un `ValidationPipe`."

**Por qué queda pendiente.** El `ValidationPipe` responde con su propio formato
de error (una lista de mensajes en inglés), distinto del `{ error }` que usa el
resto de la API. Adoptarlo bien es una decisión de diseño de la API, no un
arreglo local. Mientras tanto, el controlador ya convierte el cuerpo a un
`PedidoDeSolicitud` tipado antes de que llegue al servicio.

## CR4 · Sin linter ni formateador · Baja · Pendiente, justificada

**Feedback.** "El formato es consistente porque lo cuidamos a mano, pero nada lo
verifica."

**Por qué queda pendiente.** Configurar ESLint y Prettier y formatear todo el
código ahora produciría un commit que toca todos los archivos y ensuciaría el
historial que muestra cada refactoring. Se agrega como primer paso del trabajo
futuro.

## CR10 · Comparación no estricta en `urgente` · Baja · Aceptada como está

**Dónde:** `cuerpo.urgente == true`.

**Feedback.** "Con `==` también se acepta `1` o `"1"` como urgente, pero no el
texto `"true"` (`"true" == true` es `false`). Es una regla que nadie eligió: sale
de cómo JavaScript convierte los tipos."

**Decisión.** Se mantiene por ahora, porque es el comportamiento de la versión
inicial y cambiarlo rompería a un cliente que mande `1`. La solución correcta es
la de CR2: validar el cuerpo con un DTO que defina qué valores se aceptan. Las
dos observaciones se resuelven juntas.

## CR7 · README incompleto · Baja · Pasa a la etapa de documentación

El README de la versión inicial tiene tres líneas. Se completa en la etapa
`etapa-docs` con descripción, instalación, uso, funcionalidades y tecnologías.
