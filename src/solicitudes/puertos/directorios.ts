import { Estudiante, Responsable } from '../dominio/datos';

export abstract class DirectorioEstudiantes {
  abstract buscarPorId(id: number): Estudiante | undefined;
}

export abstract class DirectorioResponsables {
  abstract buscarPorId(id: number): Responsable | undefined;
}
