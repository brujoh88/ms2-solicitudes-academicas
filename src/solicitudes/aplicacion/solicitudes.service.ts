import { Injectable } from '@nestjs/common';
import { DatosSolicitud, Responsable } from '../dominio/datos';
import { ErrorDeNegocio } from '../dominio/errores';
import { CondicionesDeAtencion, FiltroSolicitudes, PedidoDeSolicitud } from '../dominio/parametros';
import { subirUnNivel } from '../dominio/prioridad';
import {
  Condicion,
  LARGO_MINIMO_DE_TEXTO,
  MAXIMO_ABIERTAS_POR_RESPONSABLE,
  MILISEGUNDOS_POR_DIA,
  tieneLargoMinimo,
} from '../dominio/reglas';
import { Solicitud } from '../dominio/solicitud';
import { buscarTipo, TipoSolicitud } from '../dominio/tipo-solicitud';
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
    const tipo = this.validarPedido(pedido);
    this.verificarQueElEstudiantePuedaIniciarlo(pedido.estudianteId, tipo);

    const solicitud = Solicitud.crear(
      this.solicitudes.siguienteId(),
      pedido,
      this.condicionesDeAtencion(pedido, tipo),
    );
    return this.guardar(solicitud);
  }

  asignarResponsable(id: number, responsableId: number): DatosSolicitud {
    const solicitud = this.cargar(id);
    solicitud.asegurarQueEsteAbierta();
    const responsable = this.responsableHabilitado(responsableId);
    if (responsable.area !== buscarTipo(solicitud.tipo).area)
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

  /** Valida el pedido y devuelve su tipo, que ya se sabe que existe. */
  private validarPedido(pedido: PedidoDeSolicitud): TipoSolicitud {
    if (pedido.estudianteId === undefined) throw new ErrorDeNegocio('Falta el estudiante');
    if (!pedido.tipo) throw new ErrorDeNegocio('Falta el tipo');
    const tipo = buscarTipo(pedido.tipo);
    if (!tipo) throw new ErrorDeNegocio('Tipo invalido');
    if (!tieneLargoMinimo(pedido.descripcion))
      throw new ErrorDeNegocio(
        `La descripcion debe tener al menos ${LARGO_MINIMO_DE_TEXTO} caracteres`,
      );
    return tipo;
  }

  private verificarQueElEstudiantePuedaIniciarlo(estudianteId: number, tipo: TipoSolicitud): void {
    const estudiante = this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ErrorDeNegocio('El estudiante no existe');
    if (estudiante.condicion !== Condicion.REGULAR && !tipo.admiteEstudiantesLibres)
      throw new ErrorDeNegocio('Solo los estudiantes regulares pueden iniciar este tramite');
  }

  private condicionesDeAtencion(
    pedido: PedidoDeSolicitud,
    tipo: TipoSolicitud,
  ): CondicionesDeAtencion {
    const fechaAlta = this.reloj.ahora();
    return {
      prioridad: pedido.urgente ? subirUnNivel(tipo.prioridadBase) : tipo.prioridadBase,
      fechaAlta,
      fechaLimite: new Date(fechaAlta.getTime() + tipo.plazoEnDias * MILISEGUNDOS_POR_DIA),
    };
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
          otra.responsableId === responsable.id && otra.estaAbierta() && otra.id !== solicitudId,
      );
    if (abiertas.length >= MAXIMO_ABIERTAS_POR_RESPONSABLE)
      throw new ErrorDeNegocio(
        `El responsable ya tiene ${MAXIMO_ABIERTAS_POR_RESPONSABLE} solicitudes abiertas`,
      );
  }
}
