# Solicitudes Académicas

API para registrar y seguir las solicitudes que los estudiantes hacen a la
facultad: certificados, equivalencias, cambios de comisión y reclamos de nota.

Es el sistema base del **Trabajo Práctico Integrador de Metodología de Sistemas
II** (UTN, Tecnicatura Universitaria en Programación a Distancia). El trabajo no
consiste en agregarle funciones sino en **diagnosticar su calidad interna,
refactorizarlo sin cambiar su comportamiento, probarlo y revisarlo**. El
historial del repositorio cuenta ese recorrido etapa por etapa.

**Integrantes:** Gustavo Hernán Tiseira y Nicolás Viruel.

## Funcionalidades

| Operación | Endpoint | Reglas |
|---|---|---|
| Registrar una solicitud | `POST /solicitudes` | Solo los estudiantes regulares inician trámites; los libres solo pueden reclamar una nota. La prioridad y el plazo dependen del tipo; `urgente` sube un nivel la prioridad |
| Asignar un responsable | `PUT /solicitudes/:id/responsable` | El responsable tiene que estar activo, ser del área que atiende el tipo y tener menos de 5 solicitudes abiertas |
| Cambiar el estado | `PUT /solicitudes/:id/estado` | `PENDIENTE → EN_REVISION` (con responsable) o `RECHAZADA`; `EN_REVISION → RESUELTA` o `RECHAZADA`. Rechazar exige un motivo de al menos 10 caracteres |
| Buscar y filtrar | `GET /solicitudes` | Filtros opcionales: `estado`, `tipo`, `responsableId`, `estudianteId`, `texto` |
| Ver una solicitud | `GET /solicitudes/:id` | |
| Reporte | `GET /solicitudes/reporte` | Totales por estado y por tipo, solicitudes vencidas y días promedio de resolución |

| Tipo | Prioridad | Plazo | Área |
|---|---|---|---|
| `CERTIFICADO` | Baja | 2 días | Bedelía |
| `EQUIVALENCIA` | Media | 20 días | Departamento académico |
| `CAMBIO_COMISION` | Alta | 3 días | Bedelía |
| `RECLAMO_NOTA` | Alta | 5 días | Departamento académico |

**Errores:** responden `{ "error": "mensaje" }` con `400` (datos inválidos),
`404` (la solicitud no existe) o `409` (una regla de negocio impide la
operación).

## Tecnologías

- **NestJS 11** sobre Node.js, en **TypeScript**
- **Persistencia en archivos JSON** (`data/`); la decisión está justificada en
  [docs/decisiones.md](docs/decisiones.md)
- **Jest** y **Supertest** para las pruebas

## Instalación y uso

Requiere Node.js 20 o superior.

```bash
npm install
npm start                 # http://localhost:3000
```

Ejemplos:

```bash
# Registrar una solicitud
curl -X POST http://localhost:3000/solicitudes \
  -H 'Content-Type: application/json' \
  -d '{"estudianteId": 1, "tipo": "EQUIVALENCIA", "descripcion": "Equivalencia de Bases de Datos 1"}'

# Asignarle un responsable del Departamento Académico
curl -X PUT http://localhost:3000/solicitudes/9/responsable \
  -H 'Content-Type: application/json' -d '{"responsableId": 3}'

# Buscar las pendientes y ver el reporte
curl 'http://localhost:3000/solicitudes?estado=PENDIENTE'
curl http://localhost:3000/solicitudes/reporte
```

Los datos de `data/` son **sintéticos**: 5 estudiantes, 4 responsables y 8
solicitudes de ejemplo. La API los modifica al usarla; `git checkout data/` los
restaura.

## Pruebas

```bash
npm test                          # 88 pruebas
npm run test:cov                  # con cobertura (100 % de líneas)
scripts/comparar-versiones.sh     # los mismos tests sobre la versión inicial y la refactorizada
```

## Estructura

```
src/
├── app.module.ts
└── solicitudes/
    ├── solicitudes.controller.ts     HTTP: traduce pedidos a casos de uso
    ├── errores-de-negocio.filter.ts  errores de negocio → códigos HTTP
    ├── aplicacion/                   casos de uso y reporte
    ├── dominio/                      la solicitud, sus tipos, estados y reglas
    ├── puertos/                      abstracciones de persistencia y reloj
    └── infraestructura/              implementación en archivos JSON
test/
├── caracterizacion.e2e.spec.ts       contrato externo, escrito antes de refactorizar
├── unidad/                           dominio, servicios, infraestructura y revisión
└── dobles/                           repositorios y reloj en memoria
docs/                                 diagnóstico, refactorings, pruebas, revisión y decisiones
```

## El recorrido en el historial

| Tag | Qué marca |
|---|---|
| `estado-inicial` | El sistema base: funciona, pero con un controlador de 288 líneas que hace todo |
| `etapa-diagnostico` | Tests de caracterización y diagnóstico de 12 *code smells* |
| `etapa-refactoring` | Cinco refactorings, uno por commit, con los tests en verde en cada paso |
| `etapa-pruebas` | Pruebas unitarias con dobles en memoria y verificación antes/después |
| `etapa-docs` | Revisión de código aplicada y documentación completa |
| `estadorefactorizado` | Estado final |

Para ver el antes y el después: `git diff estado-inicial estadorefactorizado -- src/`.

## Documentación

- [Diagnóstico: calidad externa e interna, deuda técnica y code smells](docs/diagnostico.md)
- [SOLID, Clean Code y los cinco refactorings](docs/refactorings.md)
- [Pruebas y verificación del comportamiento](docs/pruebas.md)
- [Checklist de code review](docs/code-review/checklist.md) y [registro de observaciones](docs/code-review/revision.md)
- [Decisiones técnicas](docs/decisiones.md)
- [Evidencias: comparación antes/después y cobertura](docs/evidencias/)
