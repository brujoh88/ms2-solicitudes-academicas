import { Injectable } from '@nestjs/common';
import { DatosSolicitud, Responsable } from '../dominio/datos';
import { ErrorDeNegocio } from '../dominio/errores';
import { CondicionesDeAtencion, FiltroSolicitudes, PedidoDeSolicitud } from '../dominio/parametros';
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

  buscar(filtro: FiltroSolicitudes): DatosSolicitud[] {
    return this.solicitudes
      .todas()
      .filter((datos) => Solicitud.desde(datos).coincideCon(filtro));
  }

  obtener(id: number): DatosSolicitud {
    return this.cargar(id).aDatos();
  }

  registrar(pedido: PedidoDeSolicitud): DatosSolicitud {
    this.validarPedido(pedido);
    this.verificarQueElEstudiantePuedaIniciarlo(pedido.estudianteId, pedido.tipo);

    const solicitud = Solicitud.crear(
      this.solicitudes.siguienteId(),
      pedido,
      this.condicionesDeAtencion(pedido),
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

  private validarPedido(pedido: PedidoDeSolicitud): void {
    if (pedido.estudianteId === undefined) throw new ErrorDeNegocio('Falta el estudiante');
    if (!pedido.tipo) throw new ErrorDeNegocio('Falta el tipo');
    if (
      pedido.tipo != 'CERTIFICADO' &&
      pedido.tipo != 'EQUIVALENCIA' &&
      pedido.tipo != 'CAMBIO_COMISION' &&
      pedido.tipo != 'RECLAMO_NOTA'
    )
      throw new ErrorDeNegocio('Tipo invalido');
    if (!pedido.descripcion || pedido.descripcion.trim().length < 10)
      throw new ErrorDeNegocio('La descripcion debe tener al menos 10 caracteres');
  }

  private condicionesDeAtencion(pedido: PedidoDeSolicitud): CondicionesDeAtencion {
    const fechaAlta = this.reloj.ahora();
    return {
      prioridad: this.calcularPrioridad(pedido.tipo, pedido.urgente),
      fechaAlta,
      fechaLimite: new Date(fechaAlta.getTime() + this.plazoEnDias(pedido.tipo) * 86400000),
    };
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
