# Diagnóstico de calidad - versión inicial

Analiza el código del tag `estado-inicial`. Las líneas citadas son de
`src/solicitudes.controller.ts` en ese tag.

## Red de seguridad antes de diagnosticar

Antes de tocar nada escribimos **tests de caracterización**
(`test/caracterizacion.e2e.spec.ts`): no dicen cómo *debería* comportarse el
sistema, registran cómo se comporta *hoy*, defectos incluidos. Son 43 casos sobre
las cinco operaciones y cubren el 96 % de las líneas del controlador
(`npm run test:cov`).

Las únicas líneas sin cubrir son los seis `catch` que se tragan el error al leer
un archivo (14, 35, 80, 156, 197, 254). No se pueden probar porque el código abre
`./data/*.json` por su cuenta y no hay forma de pasarle otro archivo. Para poder
testear siquiera lo demás, el test tuvo que respaldar los datos reales y
restaurarlos después de cada caso, y falsear el reloj del sistema. Esa dificultad
ya es un hallazgo del diagnóstico (smell 9).

## Etapa 2 - Calidad externa contra calidad interna

### Lo que ve el usuario: funciona

| Operación | Endpoint | Comportamiento verificado |
|---|---|---|
| Registrar solicitud | `POST /solicitudes` | Valida datos, solo los regulares inician trámites (los libres solo reclaman notas), calcula prioridad y plazo según el tipo |
| Asignar responsable | `PUT /solicitudes/:id/responsable` | El responsable tiene que estar activo, ser del área del tipo y tener menos de 5 abiertas |
| Cambiar estado | `PUT /solicitudes/:id/estado` | Respeta las transiciones válidas y exige motivo para rechazar |
| Buscar y filtrar | `GET /solicitudes` | Por estado, tipo, responsable, estudiante y texto |
| Reporte | `GET /solicitudes/reporte` | Totales por estado y tipo, vencidas y días promedio de resolución |

Las reglas de negocio se cumplen en todos los casos probados. Un usuario que solo
mira las respuestas diría que el sistema anda.

### Lo que el usuario sí llega a sufrir

- **Los errores responden como éxitos.** Una solicitud inexistente devuelve `200`;
  un registro inválido, `201`. Un cliente que confía en el código HTTP (un
  frontend, otro sistema) interpreta un fracaso como un alta exitosa.
- **Un archivo dañado se disfraza de dato faltante.** Si `estudiantes.json` no se
  puede leer, el sistema responde "El estudiante no existe" en vez de avisar de
  una falla.

### Lo que no se ve: la estructura interna

| Medida | Valor |
|---|---|
| Clases con lógica | 1 (`SolicitudesController`, 288 líneas) |
| Responsabilidades de esa clase | 6: HTTP, validación, reglas de negocio, persistencia, cálculo de fechas y reporte |
| Método más largo | `registrar`, 85 líneas (88-172) |
| Lecturas del mismo archivo copiadas | 6 |
| `switch` sobre el tipo de solicitud | 3 |

**Qué significa para la evolución.** El costo aparece cuando hay que cambiar algo:

- *Agregar un tipo de solicitud* (por ejemplo, "Pedido de beca") obliga a tocar
  cuatro lugares del mismo método y de otro: la validación del tipo y los tres
  `switch`. Olvidarse uno no da error de compilación: si falta el plazo, `dias` queda
  `undefined`, el cálculo de la fecha límite lanza `Invalid time value` y el
  usuario recibe un error 500.
- *Pasar de archivos JSON a una base de datos* obliga a reescribir el controlador
  entero, porque la persistencia está mezclada con todo lo demás.
- *Testear una regla* exige levantar la aplicación HTTP completa y escribir
  archivos reales.

Calidad externa aceptable y calidad interna baja: el sistema funciona hoy, pero
cada cambio futuro es caro y riesgoso.

## Etapa 3 - Deuda técnica y code smells

Prioridad: **Alta** si bloquea los cambios más probables o ya produce un defecto
visible; **Media** si encarece el mantenimiento sin bloquearlo; **Baja** si solo
afecta la lectura.

| # | Smell | Ubicación | Evidencia | Impacto | Riesgo de mantenimiento | Prioridad |
|---|---|---|---|---|---|---|
| 1 | **Clase dios** (Large Class) | `SolicitudesController`, todo el archivo | 288 líneas y 6 responsabilidades en una sola clase | Cualquier cambio toca el mismo archivo | Conflictos entre los dos integrantes; un cambio en el reporte puede romper el registro | Alta |
| 2 | **Método largo** (Long Method) | `registrar`, 88-172 | 85 líneas: valida, busca el estudiante, calcula prioridad y plazo, genera el id y persiste | Difícil de leer y de probar por partes | Una regla nueva se agrega "donde entra" y el método crece | Alta |
| 3 | **Switch repetido** sobre el tipo | 116, 137 y 214, más la validación de 93-99 | Tres `switch` que deciden prioridad, plazo y área según el mismo dato | Viola OCP: agregar un tipo es modificar código existente en 4 lugares | Olvidar uno compila igual y explota en producción (error 500 por plazo `undefined`) | Alta |
| 4 | **Código duplicado** | Lecturas en 12, 33, 78, 154, 195 y 252; escrituras en 170, 243 y 285; validación del motivo en 266 y 274 | El mismo bloque `try { JSON.parse(readFileSync) } catch` copiado 6 veces | Un arreglo en la lectura hay que repetirlo 6 veces | Las copias divergen: dos ya ignoran el error de otra forma (107, 207) | Alta |
| 5 | **Lista de parámetros larga** | `crear`, 174 | 8 parámetros, casi todos `string`, que se pasan por posición | Invertir dos argumentos compila y guarda datos cruzados | Cada dato nuevo de la solicitud alarga la firma | Media |
| 6 | **Números y textos mágicos** | `86400000` en 63 y 166; `5` en 240; `10` en 100, 266 y 274; plazos 2, 3, 5 y 20 en 137-150 | Valores de negocio sin nombre, repetidos | No se sabe qué representan sin leer el contexto | Cambiar el mínimo del motivo exige encontrar cada `10` | Media |
| 7 | **Obsesión por primitivos** | Estados, tipos y prioridades como `string`; fechas como texto ISO; `q: any` y `b: any` en 9 y 89 | Los cuatro estados aparecen escritos a mano 16 veces, y los cuatro tipos, otras 16 | Un error de tipeo (`'PENDINTE'`) no lo detecta el compilador | Las reglas del estado quedan repartidas en `if` en vez de vivir en un tipo | Media |
| 8 | **Manejo de errores deficiente** | `catch` vacíos en 107 y 207; `catch` que devuelven lista vacía en 13, 34, 79, 155, 196 y 253; `return { error }` en 83, 91-112, 200-240 y 257-279 | Los errores se tragan o se devuelven con código de éxito | Defecto visible: `200`/`201` en un fracaso; un archivo dañado parece un dato faltante | Las fallas reales quedan ocultas hasta que alguien revisa los datos a mano | Alta |
| 9 | **Dependencia directa de la infraestructura** (viola DIP) | `fs` y la ruta `./data` en cada método; `new Date()` en 53, 158 y 282 | El controlador decide dónde y cómo se guardan los datos y qué hora es | No se puede probar sin archivos reales ni reloj real | Cambiar de almacenamiento obliga a reescribir el controlador | Alta |
| 10 | **Envidia de datos** (Feature Envy) | Reporte, 50-67; transiciones, 259-279 | El controlador revisa el historial y las fechas de la solicitud para saber si está vencida o cuánto tardó, y decide las transiciones con `if` anidados | La lógica de la solicitud vive fuera de la solicitud | Otra pantalla que necesite "¿está vencida?" va a copiar el cálculo | Media |
| 11 | **Nombres poco expresivos** | `q`, `b`, `p`, `r`, `s`, `c`, `d`, `n`, `ok`, `uno()` | Hay que leer el cuerpo para saber qué es cada variable | Más tiempo para entender el código | Malentendidos en la revisión | Baja |
| 12 | **Comentarios que suplen nombres** | `// validaciones`, `// prioridad segun el tipo`, `// plazo en dias segun el tipo` | Cada comentario marca un bloque que debería ser un método con ese nombre | El comentario se desactualiza y el código no | Bajo | Baja |

### Cómo se conectan

Los smells no son independientes. La **clase dios (1)** es la causa estructural:
como todo está en un lugar, el **método largo (2)** y la **duplicación (4)** no
tienen dónde repartirse. La **obsesión por primitivos (7)** alimenta el **switch
repetido (3)**: si el tipo fuera un objeto que sabe su prioridad, su plazo y su
área, no haría falta preguntarle tres veces. Y la **dependencia de la
infraestructura (9)** es la que impide probar todo lo demás de forma aislada.

Por eso el orden de corrección no es el de la tabla: primero se separa la
persistencia y el reloj (9, que habilita los tests unitarios), después se
extraen las responsabilidades (1, 2, 4) y recién ahí se reemplazan los
`switch` (3) y los primitivos (7).

### Deuda que se declara y no se paga en este trabajo

- **Escrituras concurrentes.** Dos registros simultáneos leen el mismo archivo,
  calculan el mismo id y el segundo pisa al primero. Con archivos JSON no hay
  transacciones; se resolvería con una base de datos. Queda fuera del alcance:
  el foco es la calidad interna, no la escala.
- **Validación de tipos de entrada.** `estudianteId: "abc"` se compara con `==` y
  falla por "no existe" en vez de por "dato inválido".
