import { Injectable } from '@nestjs/common';
import { Solicitud } from '../dominio/solicitud';
import { Reloj } from '../puertos/reloj';
import { LectorSolicitudes } from '../puertos/repositorio-solicitudes';

/**
 * El reporte solo consulta: depende de LectorSolicitudes y no del repositorio
 * completo, así no puede modificar solicitudes ni necesita saber cómo se guardan.
 */
@Injectable()
export class ReporteService {
  constructor(
    private readonly solicitudes: LectorSolicitudes,
    private readonly reloj: Reloj,
  ) {}

  generar() {
    const solicitudes = this.solicitudes.todas().map((datos) => Solicitud.desde(datos));
    const ahora = this.reloj.ahora();
    const r: any = {
      total: solicitudes.length,
      porEstado: { PENDIENTE: 0, EN_REVISION: 0, RESUELTA: 0, RECHAZADA: 0 },
      porTipo: { CERTIFICADO: 0, EQUIVALENCIA: 0, CAMBIO_COMISION: 0, RECLAMO_NOTA: 0 },
      vencidas: solicitudes.filter((s) => s.estaVencida(ahora)).map((s) => s.id),
      promedioDiasResolucion: this.promedioDiasResolucion(solicitudes),
    };
    for (const s of solicitudes) {
      r.porEstado[s.estado]++;
      r.porTipo[s.tipo]++;
    }
    return r;
  }

  private promedioDiasResolucion(solicitudes: Solicitud[]): number | null {
    const dias = solicitudes
      .map((s) => s.diasDeResolucion())
      .filter((d): d is number => d !== null);
    if (dias.length === 0) return null;
    const promedio = dias.reduce((suma, d) => suma + d, 0) / dias.length;
    return Math.round(promedio * 10) / 10;
  }
}
