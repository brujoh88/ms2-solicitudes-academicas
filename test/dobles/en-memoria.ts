// Implementaciones en memoria de los puertos. Cumplen el mismo contrato que las
// de archivos JSON (LSP): los servicios no notan la diferencia, y las pruebas
// unitarias corren sin tocar el disco ni depender de la hora real.
import { DatosSolicitud, Estudiante, Responsable } from '../../src/solicitudes/dominio/datos';
import { Estado } from '../../src/solicitudes/dominio/estado';
import { Prioridad } from '../../src/solicitudes/dominio/prioridad';
import { Condicion } from '../../src/solicitudes/dominio/reglas';
import { Area } from '../../src/solicitudes/dominio/tipo-solicitud';
import {
  DirectorioEstudiantes,
  DirectorioResponsables,
} from '../../src/solicitudes/puertos/directorios';
import { Reloj } from '../../src/solicitudes/puertos/reloj';
import { RepositorioSolicitudes } from '../../src/solicitudes/puertos/repositorio-solicitudes';

export class RepositorioEnMemoria extends RepositorioSolicitudes {
  constructor(private solicitudes: DatosSolicitud[] = []) {
    super();
  }
  todas() {
    return structuredClone(this.solicitudes);
  }
  buscarPorId(id: number) {
    return this.todas().find((s) => s.id === id);
  }
  siguienteId() {
    return this.solicitudes.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  }
  guardar(solicitud: DatosSolicitud) {
    this.solicitudes = [
      ...this.solicitudes.filter((s) => s.id !== solicitud.id),
      structuredClone(solicitud),
    ].sort((a, b) => a.id - b.id);
  }
}

export class EstudiantesEnMemoria extends DirectorioEstudiantes {
  constructor(private readonly estudiantes: Estudiante[]) {
    super();
  }
  buscarPorId(id: number) {
    return this.estudiantes.find((e) => e.id === id);
  }
}

export class ResponsablesEnMemoria extends DirectorioResponsables {
  constructor(private readonly responsables: Responsable[]) {
    super();
  }
  buscarPorId(id: number) {
    return this.responsables.find((r) => r.id === id);
  }
}

export class RelojFijo extends Reloj {
  constructor(private momento: Date) {
    super();
  }
  ahora() {
    return new Date(this.momento);
  }
  avanzarDias(dias: number) {
    this.momento = new Date(this.momento.getTime() + dias * 24 * 60 * 60 * 1000);
  }
}

export const AHORA = new Date('2026-11-03T12:00:00.000Z');

export const ESTUDIANTES: Estudiante[] = [
  { id: 1, nombre: 'Regular', legajo: 'T-1', condicion: Condicion.REGULAR },
  { id: 2, nombre: 'Libre', legajo: 'T-2', condicion: Condicion.LIBRE },
];

export const RESPONSABLES: Responsable[] = [
  { id: 10, nombre: 'Bedelía', area: Area.BEDELIA, activo: true },
  { id: 20, nombre: 'Departamento', area: Area.DEPARTAMENTO_ACADEMICO, activo: true },
  { id: 30, nombre: 'Inactivo', area: Area.BEDELIA, activo: false },
];

/** Una solicitud de ejemplo; se pisan solo los campos que importan en cada test. */
export function solicitud(cambios: Partial<DatosSolicitud> = {}): DatosSolicitud {
  return {
    id: 1,
    estudianteId: 1,
    tipo: 'CERTIFICADO',
    descripcion: 'Certificado de alumno regular',
    prioridad: Prioridad.BAJA,
    estado: Estado.PENDIENTE,
    responsableId: null,
    fechaAlta: '2026-11-01T12:00:00.000Z',
    fechaLimite: '2026-11-03T12:00:00.000Z',
    canal: 'WEB',
    historial: [{ estado: Estado.PENDIENTE, fecha: '2026-11-01T12:00:00.000Z' }],
    ...cambios,
  };
}
