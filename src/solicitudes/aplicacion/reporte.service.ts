import { Injectable } from '@nestjs/common';
import { Estado } from '../dominio/estado';
import { Solicitud } from '../dominio/solicitud';
import { TIPOS_DE_SOLICITUD } from '../dominio/tipo-solicitud';
import { Reloj } from '../puertos/reloj';
import { LectorSolicitudes } from '../puertos/repositorio-solicitudes';

export interface Reporte {
  total: number;
  porEstado: Record<string, number>;
  porTipo: Record<string, number>;
  vencidas: number[];
  promedioDiasResolucion: number | null;
}

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

  generar(): Reporte {
    const solicitudes = this.solicitudes.todas().map((datos) => Solicitud.desde(datos));
    const ahora = this.reloj.ahora();
    return {
      total: solicitudes.length,
      porEstado: this.contar(Object.values(Estado), solicitudes.map((s) => s.estado)),
      porTipo: this.contar(
        TIPOS_DE_SOLICITUD.map((tipo) => tipo.codigo),
        solicitudes.map((s) => s.tipo),
      ),
      vencidas: solicitudes.filter((s) => s.estaVencida(ahora)).map((s) => s.id),
      promedioDiasResolucion: this.promedioDiasResolucion(solicitudes),
    };
  }

  /** Cuántas veces aparece cada clave; las que no aparecen quedan en 0. */
  private contar(claves: string[], valores: string[]): Record<string, number> {
    const conteo = Object.fromEntries(claves.map((clave) => [clave, 0]));
    for (const valor of valores) conteo[valor]++;
    return conteo;
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
