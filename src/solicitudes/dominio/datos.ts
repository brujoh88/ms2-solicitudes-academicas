import { Estado } from './estado';
import { Prioridad } from './prioridad';
import { Area } from './tipo-solicitud';
import { Condicion } from './reglas';

// Forma en que se guardan los datos. El dominio trabaja sobre estas estructuras
// y la infraestructura decide dónde y cómo se persisten.

export interface EntradaHistorial {
  estado: Estado;
  fecha: string;
  motivo?: string;
}

export interface DatosSolicitud {
  id: number;
  estudianteId: number;
  tipo: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  responsableId: number | null;
  fechaAlta: string;
  fechaLimite: string;
  canal: string;
  historial: EntradaHistorial[];
}

export interface Estudiante {
  id: number;
  nombre: string;
  legajo: string;
  condicion: Condicion;
}

export interface Responsable {
  id: number;
  nombre: string;
  area: Area;
  activo: boolean;
}
