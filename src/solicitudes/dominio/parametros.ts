import { Estado } from './estado';
import { Prioridad } from './prioridad';

// Objetos de parámetros: agrupan datos que siempre viajan juntos y les ponen
// nombre, en lugar de pasarlos sueltos y por posición.

/** Lo que pide el estudiante al registrar una solicitud. */
export interface PedidoDeSolicitud {
  estudianteId: number;
  tipo: string;
  descripcion: string;
  urgente: boolean;
  canal?: string;
}

/** Cómo se va a atender: lo decide el sistema a partir del pedido. */
export interface CondicionesDeAtencion {
  prioridad: Prioridad;
  fechaAlta: Date;
  fechaLimite: Date;
}

/** Criterios de búsqueda; los que no vienen no filtran. */
export interface FiltroSolicitudes {
  estado?: Estado;
  tipo?: string;
  responsableId?: number;
  estudianteId?: number;
  texto?: string;
}
