import { Injectable } from '@nestjs/common';
import { DatosSolicitud, Responsable } from '../dominio/datos';
import { ErrorDeNegocio } from '../dominio/errores';
import { Solicitud } from '../dominio/solicitud';
import { DirectorioEstudiantes, DirectorioResponsables } from '../puertos/directorios';
import { Reloj } from '../puertos/reloj';
import { RepositorioSolicitudes } from '../puertos/repositorio-solicitudes';

/** Casos de uso sobre las solicitudes. No sabe nada de HTTP ni de archivos. */
@Injectable()
export class SolicitudesService {
  constructor(
    private readonly solicitudes: RepositorioSolicitudes,
    private readonly estudiantes: DirectorioEstudiantes,
    private readonly responsables: DirectorioResponsables,
    private readonly reloj: Reloj,
  ) {}

  buscar(q: any): DatosSolicitud[] {
    let res = this.solicitudes.todas();
    if (q.estado) res = res.filter((s) => s.estado == q.estado);
    if (q.tipo) res = res.filter((s) => s.tipo == q.tipo);
    if (q.responsableId) res = res.filter((s) => s.responsableId == q.responsableId);
    if (q.estudianteId) res = res.filter((s) => s.estudianteId == q.estudianteId);
    if (q.texto)
      res = res.filter(
        (s) => s.descripcion.toLowerCase().indexOf(q.texto.toLowerCase()) >= 0,
      );
    return res;
  }

  obtener(id: number): DatosSolicitud {
    return this.cargar(id).aDatos();
  }

  registrar(b: any): DatosSolicitud {
    this.validarDatosDeRegistro(b);
    this.verificarQueElEstudiantePuedaIniciarlo(Number(b.estudianteId), b.tipo);

    const hoy = this.reloj.ahora();
    const solicitud = Solicitud.crear(
      this.solicitudes.siguienteId(),
      b.estudianteId,
      b.tipo,
      b.descripcion.trim(),
      this.calcularPrioridad(b.tipo, b.urgente == true),
      hoy.toISOString(),
      new Date(hoy.getTime() + this.plazoEnDias(b.tipo) * 86400000).toISOString(),
      b.canal || 'WEB',
    );
    return this.guardar(solicitud);
  }

  asignarResponsable(id: number, responsableId: number): DatosSolicitud {
    const solicitud = this.cargar(id);
    solicitud.asegurarQueEsteAbierta();
    const responsable = this.responsableHabilitado(responsableId);
    if (responsable.area != this.areaQueAtiende(solicitud.tipo))
      throw new ErrorDeNegocio('El responsable no pertenece al area que atiende este tipo');
    this.verificarCupoDelResponsable(responsable, solicitud.id);

    solicitud.asignarResponsable(responsable.id);
    return this.guardar(solicitud);
  }

  cambiarEstado(id: number, nuevo: string, motivo?: string): DatosSolicitud {
    const solicitud = this.cargar(id);
    solicitud.cambiarEstado(nuevo, motivo, this.reloj.ahora());
    return this.guardar(solicitud);
  }

  private cargar(id: number): Solicitud {
    const datos = this.solicitudes.buscarPorId(id);
    if (!datos) throw new ErrorDeNegocio('No existe la solicitud');
    return Solicitud.desde(datos);
  }

  private guardar(solicitud: Solicitud): DatosSolicitud {
    const datos = solicitud.aDatos();
    this.solicitudes.guardar(datos);
    return datos;
  }

  private validarDatosDeRegistro(b: any): void {
    if (!b.estudianteId) throw new ErrorDeNegocio('Falta el estudiante');
    if (!b.tipo) throw new ErrorDeNegocio('Falta el tipo');
    if (
      b.tipo != 'CERTIFICADO' &&
      b.tipo != 'EQUIVALENCIA' &&
      b.tipo != 'CAMBIO_COMISION' &&
      b.tipo != 'RECLAMO_NOTA'
    )
      throw new ErrorDeNegocio('Tipo invalido');
    if (!b.descripcion || b.descripcion.trim().length < 10)
      throw new ErrorDeNegocio('La descripcion debe tener al menos 10 caracteres');
  }

  private verificarQueElEstudiantePuedaIniciarlo(estudianteId: number, tipo: string): void {
    const estudiante = this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ErrorDeNegocio('El estudiante no existe');
    if (estudiante.condicion != 'REGULAR' && tipo != 'RECLAMO_NOTA')
      throw new ErrorDeNegocio('Solo los estudiantes regulares pueden iniciar este tramite');
  }

  private calcularPrioridad(tipo: string, urgente: boolean): string {
    let prioridad;
    switch (tipo) {
      case 'RECLAMO_NOTA':
        prioridad = 'ALTA';
        break;
      case 'CAMBIO_COMISION':
        prioridad = 'ALTA';
        break;
      case 'EQUIVALENCIA':
        prioridad = 'MEDIA';
        break;
      default:
        prioridad = 'BAJA';
    }
    if (urgente) {
      if (prioridad == 'BAJA') prioridad = 'MEDIA';
      else if (prioridad == 'MEDIA') prioridad = 'ALTA';
    }
    return prioridad;
  }

  private plazoEnDias(tipo: string): number {
    switch (tipo) {
      case 'RECLAMO_NOTA':
        return 5;
      case 'CAMBIO_COMISION':
        return 3;
      case 'EQUIVALENCIA':
        return 20;
      case 'CERTIFICADO':
        return 2;
    }
  }

  private areaQueAtiende(tipo: string): string {
    switch (tipo) {
      case 'CERTIFICADO':
        return 'BEDELIA';
      case 'CAMBIO_COMISION':
        return 'BEDELIA';
      case 'EQUIVALENCIA':
        return 'DEPARTAMENTO_ACADEMICO';
      case 'RECLAMO_NOTA':
        return 'DEPARTAMENTO_ACADEMICO';
    }
  }

  private responsableHabilitado(responsableId: number): Responsable {
    const responsable = this.responsables.buscarPorId(responsableId);
    if (!responsable) throw new ErrorDeNegocio('El responsable no existe');
    if (!responsable.activo) throw new ErrorDeNegocio('El responsable no esta activo');
    return responsable;
  }

  private verificarCupoDelResponsable(responsable: Responsable, solicitudId: number): void {
    const abiertas = this.solicitudes
      .todas()
      .map((datos) => Solicitud.desde(datos))
      .filter(
        (otra) =>
          otra.responsableId == responsable.id && otra.estaAbierta() && otra.id != solicitudId,
      );
    if (abiertas.length >= 5)
      throw new ErrorDeNegocio('El responsable ya tiene 5 solicitudes abiertas');
  }
}
