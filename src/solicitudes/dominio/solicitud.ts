import { DatosSolicitud, EntradaHistorial } from './datos';
import { esCerrado, Estado, TRANSICIONES } from './estado';
import { DatosInvalidos, ErrorDeNegocio } from './errores';
import { CondicionesDeAtencion, FiltroSolicitudes, PedidoDeSolicitud } from './parametros';
import { buscarTipo, TipoSolicitud } from './tipo-solicitud';
import { CANAL_POR_DEFECTO, LARGO_MINIMO_DE_TEXTO, MILISEGUNDOS_POR_DIA, tieneLargoMinimo } from './reglas';

/**
 * Una solicitud con su comportamiento. Lo que antes calculaba el controlador
 * mirando sus campos desde afuera (si está vencida, cuánto tardó, a qué estado
 * puede pasar) ahora lo responde la propia solicitud.
 */
export class Solicitud {
  private constructor(private readonly datos: DatosSolicitud) {}

  static desde(datos: DatosSolicitud): Solicitud {
    return new Solicitud(structuredClone(datos));
  }

  static crear(
    id: number,
    pedido: PedidoDeSolicitud,
    condiciones: CondicionesDeAtencion,
  ): Solicitud {
    const fechaAlta = condiciones.fechaAlta.toISOString();
    return new Solicitud({
      id,
      estudianteId: pedido.estudianteId,
      tipo: pedido.tipo,
      descripcion: pedido.descripcion.trim(),
      prioridad: condiciones.prioridad,
      estado: Estado.PENDIENTE,
      responsableId: null,
      fechaAlta,
      fechaLimite: condiciones.fechaLimite.toISOString(),
      canal: pedido.canal || CANAL_POR_DEFECTO,
      historial: [{ estado: Estado.PENDIENTE, fecha: fechaAlta }],
    });
  }

  get id(): number {
    return this.datos.id;
  }

  get tipo(): string {
    return this.datos.tipo;
  }

  /**
   * Las reglas de su tipo. Si el dato guardado no corresponde a ningún tipo, los
   * datos están corruptos: es una falla interna, no un error del usuario.
   */
  tipoDeSolicitud(): TipoSolicitud {
    const tipo = buscarTipo(this.datos.tipo);
    if (!tipo) throw new Error(`Tipo de solicitud desconocido en los datos: ${this.datos.tipo}`);
    return tipo;
  }

  get estado(): Estado {
    return this.datos.estado;
  }

  get responsableId(): number | null {
    return this.datos.responsableId;
  }

  /** Indica si la solicitud cumple todos los criterios del filtro. */
  coincideCon(filtro: FiltroSolicitudes): boolean {
    const d = this.datos;
    return (
      (!filtro.estado || d.estado === filtro.estado) &&
      (!filtro.tipo || d.tipo === filtro.tipo) &&
      (filtro.responsableId === undefined || d.responsableId === filtro.responsableId) &&
      (filtro.estudianteId === undefined || d.estudianteId === filtro.estudianteId) &&
      (!filtro.texto || d.descripcion.toLowerCase().includes(filtro.texto.toLowerCase()))
    );
  }

  estaCerrada(): boolean {
    return esCerrado(this.datos.estado);
  }

  estaAbierta(): boolean {
    return !this.estaCerrada();
  }

  estaVencida(ahora: Date): boolean {
    return this.estaAbierta() && new Date(this.datos.fechaLimite).getTime() < ahora.getTime();
  }

  /** Días entre el alta y la resolución, o `null` si no está resuelta. */
  diasDeResolucion(): number | null {
    const resolucion = this.datos.historial.find((entrada) => entrada.estado === Estado.RESUELTA);
    if (!resolucion) return null;
    const alta = new Date(this.datos.fechaAlta).getTime();
    return (new Date(resolucion.fecha).getTime() - alta) / MILISEGUNDOS_POR_DIA;
  }

  asegurarQueEsteAbierta(): void {
    if (this.estaCerrada()) throw new ErrorDeNegocio('La solicitud ya esta cerrada');
  }

  asignarResponsable(responsableId: number): void {
    this.datos.responsableId = responsableId;
  }

  cambiarEstado(nuevo: string, motivo: string | undefined, ahora: Date): void {
    const destino = nuevo as Estado;
    if (!TRANSICIONES[this.datos.estado].includes(destino))
      throw new ErrorDeNegocio(`No se puede pasar de ${this.datos.estado} a ${nuevo}`);
    if (destino === Estado.EN_REVISION && this.datos.responsableId == null)
      throw new ErrorDeNegocio('No se puede revisar una solicitud sin responsable');
    if (destino === Estado.RECHAZADA && !tieneLargoMinimo(motivo))
      throw new DatosInvalidos(
        `Para rechazar hay que indicar un motivo de al menos ${LARGO_MINIMO_DE_TEXTO} caracteres`,
      );

    this.datos.estado = destino;
    const entrada: EntradaHistorial = { estado: destino, fecha: ahora.toISOString() };
    if (motivo) entrada.motivo = motivo.trim();
    this.datos.historial.push(entrada);
  }

  aDatos(): DatosSolicitud {
    return structuredClone(this.datos);
  }
}
