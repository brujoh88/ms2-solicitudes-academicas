# Etapas 4 y 5 - SOLID, Clean Code y refactoring seguro

Cinco refactorings, **uno por commit**, entre los tags `etapa-diagnostico` y
`etapa-refactoring`. Después de cada uno se corrieron los 43 tests de
caracterización: los cinco commits los pasan todos. Cada paso se puede ver
completo con `git show <commit>`.

| # | Commit | Técnica | Smells que resuelve | Principio |
|---|---|---|---|---|
| 1 | `4ba1cd4` | Extract Class + inyección de dependencias | 4 (duplicado), 8 (errores tragados), 9 (infraestructura) | DIP, ISP |
| 2 | `afd605a` | **Extract Method** y **Move Method** | 1 (clase dios), 2 (método largo), 10 (envidia de datos), 12 (comentarios) | SRP |
| 3 | `0890beb` | **Introduce Parameter Object** | 5 (parámetros largos), 10 | Clean Code |
| 4 | `d9e77c8` | Replace Conditional with Polymorphism (tabla de tipos) + Replace Magic Number with Constant | 3 (switch), 6 (mágicos), 7 (primitivos), 4 | OCP |
| 5 | `8ac9d7b` | Extract Class (filtro de excepciones) | 8 (errores) | SRP |

El orden es el que fijó el diagnóstico: primero se cortó la dependencia de la
infraestructura (1), porque es la que impedía probar todo lo demás de forma
aislada; después se repartieron responsabilidades (2 y 3); y recién con la
lógica en su lugar se reemplazaron los `switch` (4).

## Refactoring 1 - Inyectar la persistencia y el reloj (DIP)

**Antes** (copiado seis veces en el controlador):

```ts
let data = [];
try {
  data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
} catch (e) {
  data = [];
}
```

**Después:** el controlador recibe por constructor abstracciones
(`RepositorioSolicitudes`, `DirectorioEstudiantes`, `DirectorioResponsables`,
`Reloj`) y NestJS le inyecta las implementaciones JSON. La lectura vive en un
solo lugar, `ArchivoJson`:

```ts
leer(): T[] {
  if (!fs.existsSync(this.ruta)) return [];
  return JSON.parse(fs.readFileSync(this.ruta, 'utf-8'));
}
```

**Por qué es seguro.** El repositorio lee y escribe los mismos archivos con el
mismo formato; los tests lo confirman.

**Cambio de comportamiento declarado.** Un archivo que no existe sigue siendo
una lista vacía, pero uno **dañado** ahora lanza un error en vez de responder
como si no hubiera datos. No lo cubre ningún test de caracterización (eran las
únicas líneas sin cubrir) y es una mejora deliberada: ocultar la falla era el
defecto.

## Refactoring 2 - Extract Method y Move Method (SRP)

**Antes:** `registrar` tenía 85 líneas que validaban, buscaban el estudiante,
calculaban prioridad y plazo, generaban el id y escribían el archivo. Bloques
separados por comentarios (`// validaciones`, `// prioridad segun el tipo`).

**Después, Extract Method:** cada comentario pasó a ser un método con ese
nombre, y `registrar` cuenta la historia en cuatro líneas:

```ts
registrar(pedido: PedidoDeSolicitud): DatosSolicitud {
  const tipo = this.validarPedido(pedido);
  this.verificarQueElEstudiantePuedaIniciarlo(pedido.estudianteId, tipo);
  const solicitud = Solicitud.crear(this.solicitudes.siguienteId(), pedido,
    this.condicionesDeAtencion(pedido, tipo));
  return this.guardar(solicitud);
}
```

**Después, Move Method:** el reporte calculaba desde afuera si una solicitud
estaba vencida y cuántos días tardó, recorriendo su historial. Esos cálculos se
movieron a la entidad `Solicitud` (`estaVencida`, `diasDeResolucion`), igual que
las transiciones de estado (`cambiarEstado`). El reporte ahora pregunta:

```ts
vencidas: solicitudes.filter((s) => s.estaVencida(ahora)).map((s) => s.id),
```

Las responsabilidades quedaron repartidas: el controlador solo traduce HTTP,
`SolicitudesService` tiene los casos de uso, `ReporteService` el reporte y la
entidad sus propias reglas.

## Refactoring 3 - Introduce Parameter Object

**Antes:** ocho parámetros sueltos, casi todos texto, pasados por posición.
Invertir `fechaAlta` y `fechaLimite` compilaba y guardaba datos cruzados.

```ts
crear(id, estudianteId, tipo, descripcion, prioridad, fechaAlta, fechaLimite, canal)
```

**Después:** tres parámetros con nombre, que además separan lo que pide el
estudiante de lo que decide el sistema:

```ts
static crear(id: number, pedido: PedidoDeSolicitud, condiciones: CondicionesDeAtencion)
```

La búsqueda recibió el mismo tratamiento: de un `q: any` a un
`FiltroSolicitudes` tipado, con el criterio en `Solicitud.coincideCon`.

**Un caso borde que el refactoring rompía y se corrigió antes del commit.** Con
`estudianteId: "abc"`, la versión inicial respondía "El estudiante no existe".
La primera versión del refactoring convertía el valor a número antes de
validar, y como `NaN` es falso respondía "Falta el estudiante". Se ajustó para
conservar el mensaje original y se verificó con `"abc"`, `""` y `0`.

## Refactoring 4 - La tabla de tipos reemplaza a los switch (OCP)

**Antes:** el tipo de solicitud se consultaba en cuatro lugares: la validación y
tres `switch` (prioridad, plazo y área). Agregar un tipo obligaba a modificar
los cuatro, y olvidarse el del plazo producía un error 500.

**Después:** cada tipo declara todo lo que el sistema necesita saber de él:

```ts
{
  codigo: 'EQUIVALENCIA',
  prioridadBase: Prioridad.MEDIA,
  plazoEnDias: 20,
  area: Area.DEPARTAMENTO_ACADEMICO,
  admiteEstudiantesLibres: false,
},
```

Agregar un tipo es agregar una entrada: el código que la usa no se modifica.
La regla "los libres solo pueden reclamar notas", que estaba escrita como
`tipo != 'RECLAMO_NOTA'`, pasó a ser una propiedad del tipo.

Las transiciones de estado siguieron el mismo camino: los `if` anidados se
reemplazaron por una tabla.

```ts
export const TRANSICIONES = {
  [Estado.PENDIENTE]: [Estado.EN_REVISION, Estado.RECHAZADA],
  [Estado.EN_REVISION]: [Estado.RESUELTA, Estado.RECHAZADA],
  [Estado.RESUELTA]: [],
  [Estado.RECHAZADA]: [],
};
```

Los estados, prioridades, áreas y condiciones pasaron a `enum`, y los números
sueltos a constantes con nombre (`MAXIMO_ABIERTAS_POR_RESPONSABLE`,
`LARGO_MINIMO_DE_TEXTO`, `MILISEGUNDOS_POR_DIA`). Los mensajes que repetían el
número lo toman de la constante, así no quedan desactualizados.

## Refactoring 5 - Un solo lugar para los errores

**Antes:** cada rama de error hacía `return { error: '...' }`, mezclando la regla
con la forma de responder.

**Después:** el dominio lanza `ErrorDeNegocio` y un único `ExceptionFilter` lo
convierte en respuesta. **Conserva a propósito el código de éxito** de la
versión inicial, porque es lo que fijan los tests. Corregirlo es un cambio que
el usuario ve, así que se hace aparte, en la etapa de revisión, y en un solo
archivo.

## SOLID: dónde quedó cada principio

| Principio | Dónde se ve |
|---|---|
| **SRP** | Controlador (HTTP), `SolicitudesService` (casos de uso), `ReporteService` (reporte), `Solicitud` (sus reglas), repositorios (persistencia), filtro (errores) |
| **OCP** | `TIPOS_DE_SOLICITUD` y `TRANSICIONES`: se extienden agregando datos, sin tocar el código que los usa |
| **LSP** | `RepositorioSolicitudesJson` y cualquier otra implementación (por ejemplo, una en memoria para pruebas) cumplen el mismo contrato y se intercambian sin que los servicios lo noten |
| **ISP** | `LectorSolicitudes` (consultar) separado de `RepositorioSolicitudes` (consultar y guardar). `ReporteService` depende solo del primero |
| **DIP** | Los servicios dependen de clases abstractas (`RepositorioSolicitudes`, `Reloj`); el módulo de NestJS decide qué implementación concreta se usa |

## Antes y después en números

| Medida | `estado-inicial` | `etapa-refactoring` |
|---|---|---|
| Archivos de código | 3 | 22 |
| Líneas totales | 305 | 741 |
| Clase más grande | `SolicitudesController`, 288 líneas | `SolicitudesService`, 133 líneas |
| Método más largo | `registrar`, 85 líneas | `cambiarEstado`, 16 líneas |
| `switch` sobre el tipo | 3 | 0 |
| Lecturas de archivo copiadas | 6 | 1 |
| Cobertura de líneas | 96 % | 100 % |

**Hay más líneas, y es esperable.** El código creció en firmas, tipos e
interfaces con nombre; a cambio, cada pieza es chica, tiene una sola razón para
cambiar y se puede probar por separado. El objetivo no era escribir menos, era
que cambiar sea más barato.

## Lo que quedó pendiente

- **Fechas como texto ISO** en los datos persistidos: la obsesión por primitivos
  se resolvió en estados y tipos, no en fechas.
- **El cuerpo del alta llega como `any`**: falta un DTO con validación
  declarativa.
- **Los códigos HTTP** de error, a propósito, para la revisión.
