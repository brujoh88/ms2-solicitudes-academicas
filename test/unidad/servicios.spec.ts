import { ReporteService } from '../../src/solicitudes/aplicacion/reporte.service';
import { SolicitudesService } from '../../src/solicitudes/aplicacion/solicitudes.service';
import { Estado } from '../../src/solicitudes/dominio/estado';
import { Prioridad } from '../../src/solicitudes/dominio/prioridad';
import {
  AHORA,
  ESTUDIANTES,
  EstudiantesEnMemoria,
  RelojFijo,
  RepositorioEnMemoria,
  RESPONSABLES,
  ResponsablesEnMemoria,
  solicitud,
} from '../dobles/en-memoria';

// Los servicios se arman a mano, sin NestJS ni archivos: es lo que habilito el
// refactoring 1 (DIP). Antes, probar una regla exigia levantar la API completa.
function armar(solicitudes = []) {
  const repositorio = new RepositorioEnMemoria(solicitudes);
  const reloj = new RelojFijo(AHORA);
  const servicio = new SolicitudesService(
    repositorio,
    new EstudiantesEnMemoria(ESTUDIANTES),
    new ResponsablesEnMemoria(RESPONSABLES),
    reloj,
  );
  return { repositorio, reloj, servicio, reporte: new ReporteService(repositorio, reloj) };
}

const pedido = (cambios = {}) => ({
  estudianteId: 1,
  tipo: 'CERTIFICADO',
  descripcion: 'Certificado de alumno regular',
  urgente: false,
  ...cambios,
});

describe('SolicitudesService', () => {
  describe('registrar', () => {
    it('guarda la solicitud con la prioridad y el plazo de su tipo', () => {
      const { servicio, repositorio } = armar();
      const creada = servicio.registrar(pedido({ tipo: 'CAMBIO_COMISION' }));
      expect(creada).toMatchObject({
        id: 1,
        prioridad: Prioridad.ALTA,
        estado: Estado.PENDIENTE,
        fechaAlta: '2026-11-03T12:00:00.000Z',
        fechaLimite: '2026-11-06T12:00:00.000Z',
        canal: 'WEB',
      });
      expect(repositorio.todas()).toEqual([creada]);
    });

    it('urgente sube un nivel la prioridad base', () => {
      const { servicio } = armar();
      expect(servicio.registrar(pedido({ urgente: true })).prioridad).toBe(Prioridad.MEDIA);
    });

    it('un estudiante libre no puede pedir un certificado', () => {
      const { servicio, repositorio } = armar();
      expect(() => servicio.registrar(pedido({ estudianteId: 2 }))).toThrow(
        'Solo los estudiantes regulares pueden iniciar este tramite',
      );
      expect(repositorio.todas()).toEqual([]);
    });

    it('un estudiante libre si puede reclamar una nota', () => {
      const { servicio } = armar();
      expect(servicio.registrar(pedido({ estudianteId: 2, tipo: 'RECLAMO_NOTA' })).id).toBe(1);
    });
  });

  describe('asignar responsable', () => {
    it('no asigna a alguien de otra area', () => {
      const { servicio } = armar([solicitud()]);
      expect(() => servicio.asignarResponsable(1, 20)).toThrow(
        'El responsable no pertenece al area que atiende este tipo',
      );
    });

    it('respeta el maximo de 5 abiertas, sin contar las cerradas', () => {
      const abiertas = [1, 2, 3, 4, 5].map((id) => solicitud({ id, responsableId: 10 }));
      const cerrada = solicitud({ id: 6, responsableId: 10, estado: Estado.RESUELTA });
      const { servicio } = armar([...abiertas, cerrada, solicitud({ id: 7 })]);
      expect(() => servicio.asignarResponsable(7, 10)).toThrow(
        'El responsable ya tiene 5 solicitudes abiertas',
      );
    });

    it('con 4 abiertas todavia acepta una mas', () => {
      const abiertas = [1, 2, 3, 4].map((id) => solicitud({ id, responsableId: 10 }));
      const { servicio } = armar([...abiertas, solicitud({ id: 5 })]);
      expect(servicio.asignarResponsable(5, 10).responsableId).toBe(10);
    });
  });

  it('cambiar estado usa la hora del reloj inyectado', () => {
    const { servicio, reloj } = armar([solicitud({ responsableId: 10 })]);
    reloj.avanzarDias(1);
    const actualizada = servicio.cambiarEstado(1, Estado.EN_REVISION);
    expect(actualizada.historial.at(-1).fecha).toBe('2026-11-04T12:00:00.000Z');
  });

  it('una solicitud inexistente es un error de negocio', () => {
    const { servicio } = armar();
    expect(() => servicio.obtener(99)).toThrow('No existe la solicitud');
  });
});

describe('ReporteService', () => {
  it('con el sistema vacio informa ceros y promedio nulo', () => {
    const { reporte } = armar();
    expect(reporte.generar()).toEqual({
      total: 0,
      porEstado: { PENDIENTE: 0, EN_REVISION: 0, RESUELTA: 0, RECHAZADA: 0 },
      porTipo: { CERTIFICADO: 0, EQUIVALENCIA: 0, CAMBIO_COMISION: 0, RECLAMO_NOTA: 0 },
      vencidas: [],
      promedioDiasResolucion: null,
    });
  });

  it('las vencidas dependen del reloj: el mismo dato vence al pasar el tiempo', () => {
    const { reporte, reloj } = armar([solicitud({ fechaLimite: '2026-11-05T12:00:00.000Z' })]);
    expect(reporte.generar().vencidas).toEqual([]);
    reloj.avanzarDias(3);
    expect(reporte.generar().vencidas).toEqual([1]);
  });
});
