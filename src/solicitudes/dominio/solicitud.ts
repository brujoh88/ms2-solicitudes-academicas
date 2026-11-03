import { DatosSolicitud } from './datos';
import { ErrorDeNegocio } from './errores';

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

  static crear(id, estudianteId, tipo, descripcion, prioridad, fechaAlta, fechaLimite, canal) {
    return new Solicitud({
      id: id,
      estudianteId: Number(estudianteId),
      tipo: tipo,
      descripcion: descripcion,
      prioridad: prioridad,
      estado: 'PENDIENTE',
      responsableId: null,
      fechaAlta: fechaAlta,
      fechaLimite: fechaLimite,
      canal: canal,
      historial: [{ estado: 'PENDIENTE', fecha: fechaAlta }],
    });
  }

  get id(): number {
    return this.datos.id;
  }

  get tipo(): string {
    return this.datos.tipo;
  }

  get estado(): string {
    return this.datos.estado;
  }

  get responsableId(): number | null {
    return this.datos.responsableId;
  }

  estaCerrada(): boolean {
    return this.datos.estado == 'RESUELTA' || this.datos.estado == 'RECHAZADA';
  }

  estaAbierta(): boolean {
    return this.datos.estado == 'PENDIENTE' || this.datos.estado == 'EN_REVISION';
  }

  estaVencida(ahora: Date): boolean {
    return !this.estaCerrada() && new Date(this.datos.fechaLimite).getTime() < ahora.getTime();
  }

  /** Días entre el alta y la resolución, o `null` si no está resuelta. */
  diasDeResolucion(): number | null {
    const resolucion = this.datos.historial.find((entrada) => entrada.estado == 'RESUELTA');
    if (!resolucion) return null;
    return (
      (new Date(resolucion.fecha).getTime() - new Date(this.datos.fechaAlta).getTime()) /
      86400000
    );
  }

  asegurarQueEsteAbierta(): void {
    if (this.estaCerrada()) throw new ErrorDeNegocio('La solicitud ya esta cerrada');
  }

  asignarResponsable(responsableId: number): void {
    this.datos.responsableId = responsableId;
  }

  cambiarEstado(nuevo: string, motivo: string | undefined, ahora: Date): void {
    let ok = false;
    if (this.datos.estado == 'PENDIENTE') {
      if (nuevo == 'EN_REVISION') {
        if (this.datos.responsableId == null)
          throw new ErrorDeNegocio('No se puede revisar una solicitud sin responsable');
        ok = true;
      } else if (nuevo == 'RECHAZADA') {
        this.validarMotivoDeRechazo(motivo);
        ok = true;
      }
    } else if (this.datos.estado == 'EN_REVISION') {
      if (nuevo == 'RESUELTA') {
        ok = true;
      } else if (nuevo == 'RECHAZADA') {
        this.validarMotivoDeRechazo(motivo);
        ok = true;
      }
    }
    if (!ok) throw new ErrorDeNegocio('No se puede pasar de ' + this.datos.estado + ' a ' + nuevo);

    this.datos.estado = nuevo;
    const entrada: any = { estado: nuevo, fecha: ahora.toISOString() };
    if (motivo) entrada.motivo = motivo.trim();
    this.datos.historial.push(entrada);
  }

  aDatos(): DatosSolicitud {
    return structuredClone(this.datos);
  }

  private validarMotivoDeRechazo(motivo: string | undefined): void {
    if (!motivo || motivo.trim().length < 10)
      throw new ErrorDeNegocio(
        'Para rechazar hay que indicar un motivo de al menos 10 caracteres',
      );
  }
}
