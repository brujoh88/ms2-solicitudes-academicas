# Etapa 6 - Pruebas y verificación del comportamiento

## Estrategia

La pregunta que tiene que responder esta etapa es una sola: **¿el refactoring
cambió algo que el usuario ve?** Para responderla con evidencia y no con
opinión, las pruebas se armaron en tres capas con propósitos distintos.

| Capa | Archivo | Casos | Qué verifica | Cuándo se escribió |
|---|---|---:|---|---|
| Caracterización (extremo a extremo) | `test/caracterizacion.e2e.spec.ts` | 43 | El comportamiento externo por HTTP, defectos incluidos | **Antes** de refactorizar (`etapa-diagnostico`) |
| Unitarias de dominio | `test/unidad/dominio.spec.ts` | 26 | Reglas de la entidad, tabla de tipos, transiciones y prioridades | Después |
| Unitarias de servicios | `test/unidad/servicios.spec.ts` | 11 | Casos de uso y reporte con dobles en memoria | Después |
| Infraestructura | `test/unidad/infraestructura.spec.ts` | 3 | Lectura y escritura de JSON en una carpeta temporal | Después |
| **Total** | | **83** | | |

## 1. La red de seguridad: tests de caracterización

Se escribieron **antes de tocar el código**. No describen cómo debería
comportarse el sistema sino cómo se comporta, por eso incluyen casos marcados
`DEFECTO REGISTRADO`, por ejemplo que una solicitud inexistente responde `200`.
Si un refactoring rompe uno de esos casos, cambió algo visible, aunque sea un
defecto: corregirlo tiene que ser una decisión explícita, no un efecto
colateral.

Cubren las cinco operaciones: búsqueda y filtros (6), registro (16), asignación
de responsable (10), cambio de estado (10) y reporte (1).

## 2. Verificación antes/después

`scripts/comparar-versiones.sh` arma dos copias del repositorio, una en
`estado-inicial` y otra en la versión actual, y corre **el mismo archivo de
tests** en las dos:

```
== antes: estado-inicial (d0d836a)
Tests:       43 passed, 43 total
== despues: HEAD
Tests:       43 passed, 43 total
```

La salida completa está en `docs/evidencias/comparacion-antes-despues.txt`.

Además, los 43 tests se corrieron **después de cada uno de los cinco commits de
refactoring**, no solo al final: si alguno hubiera fallado, se sabría qué paso
lo rompió.

### Lo que las pruebas detectaron durante el refactoring

En el refactoring 3, al introducir el objeto `PedidoDeSolicitud`, el id del
estudiante se convertía a número antes de validarlo. Con `estudianteId: "abc"`
la versión inicial respondía "El estudiante no existe" y la nueva habría
respondido "Falta el estudiante". Se detectó revisando los casos borde que la
caracterización no cubría (`"abc"`, `""` y `0`), se corrigió antes del commit y
se dejó documentado en `docs/refactorings.md`.

**Límite que muestra el caso:** los tests de caracterización solo protegen lo
que prueban. Ese caso borde no estaba en los 43, y lo encontró una revisión
manual, no la suite.

## 3. Pruebas unitarias: lo que el refactoring hizo posible

En la versión inicial, probar una regla exigía levantar la API, escribir sobre
los archivos reales (el test tenía que respaldarlos y restaurarlos) y falsear
el reloj del sistema. Ahora los servicios se arman a mano con **dobles en
memoria** (`test/dobles/en-memoria.ts`):

```ts
const servicio = new SolicitudesService(
  new RepositorioEnMemoria(solicitudes),
  new EstudiantesEnMemoria(ESTUDIANTES),
  new ResponsablesEnMemoria(RESPONSABLES),
  new RelojFijo(AHORA),
);
```

Eso es, en la práctica, la evidencia de dos principios:

- **DIP:** los servicios dependen de abstracciones, así que se les puede pasar
  cualquier implementación.
- **LSP:** el repositorio en memoria y el de archivos JSON cumplen el mismo
  contrato y el servicio no nota la diferencia.

Con el reloj inyectado aparecieron pruebas que antes eran imposibles, por
ejemplo verificar que una misma solicitud **pasa a estar vencida cuando avanza
el tiempo**:

```ts
expect(reporte.generar().vencidas).toEqual([]);
reloj.avanzarDias(3);
expect(reporte.generar().vencidas).toEqual([1]);
```

### Casos destacados

| Caso | Por qué importa |
|---|---|
| Una solicitud no vence en el instante exacto de su fecha límite | Fija el borde de la comparación (`<` y no `<=`) |
| Un cambio de estado que falla no deja la solicitud a medio cambiar | El estado y el historial quedan intactos si se lanza el error |
| Con 4 abiertas el responsable acepta una más; con 5, no; las cerradas no cuentan | Los dos lados del límite de `MAXIMO_ABIERTAS_POR_RESPONSABLE` |
| Solo el reclamo de nota admite estudiantes libres | Protege la regla que antes estaba escrita como `tipo != 'RECLAMO_NOTA'` |
| Todo estado tiene su fila en la tabla de transiciones | Si se agrega un estado y se olvida su fila, falla este test y no producción |
| Un archivo dañado lanza error | Verifica el único cambio de comportamiento deliberado del refactoring 1 |

## 4. Cobertura

| Versión | Tests | Líneas | Ramas |
|---|---:|---:|---:|
| `estado-inicial` (solo caracterización) | 43 | 96 % | 96 % |
| Actual | 83 | 100 % | 98 % |

En la versión inicial, las líneas sin cubrir eran los seis `catch` que se
tragaban los errores: no había forma de probarlos. Ahora la lectura de archivos
vive en un solo lugar y se prueba con una carpeta temporal.

Salida completa en `docs/evidencias/cobertura.txt`. Para reproducirla:

```bash
npm test                          # las 83 pruebas
npm run test:cov                  # con cobertura
scripts/comparar-versiones.sh     # antes contra después
```

**La cobertura no es la meta.** Un 100 % de líneas no garantiza que se probaron
los casos que importan (el caso de `"abc"` lo demuestra). Por eso la tabla de
casos destacados importa más que el porcentaje.
