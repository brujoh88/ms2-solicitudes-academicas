// Forma en que se guardan los datos. El dominio trabaja sobre estas estructuras
// y la infraestructura decide dónde y cómo se persisten.

export interface EntradaHistorial {
  estado: string;
  fecha: string;
  motivo?: string;
}

export interface DatosSolicitud {
  id: number;
  estudianteId: number;
  tipo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
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
  condicion: string;
}

export interface Responsable {
  id: number;
  nombre: string;
  area: string;
  activo: boolean;
}
