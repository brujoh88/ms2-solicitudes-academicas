import { Inject, Injectable } from '@nestjs/common';
import * as path from 'path';
import { DatosSolicitud, Estudiante, Responsable } from '../dominio/datos';
import { DirectorioEstudiantes, DirectorioResponsables } from '../puertos/directorios';
import { RepositorioSolicitudes } from '../puertos/repositorio-solicitudes';
import { ArchivoJson } from './archivo-json';
import { DIRECTORIO_DATOS } from './directorio-datos';

@Injectable()
export class RepositorioSolicitudesJson extends RepositorioSolicitudes {
  private readonly archivo: ArchivoJson<DatosSolicitud>;

  constructor(@Inject(DIRECTORIO_DATOS) directorio: string) {
    super();
    this.archivo = new ArchivoJson(path.join(directorio, 'solicitudes.json'));
  }

  todas(): DatosSolicitud[] {
    return this.archivo.leer();
  }

  buscarPorId(id: number): DatosSolicitud | undefined {
    return this.todas().find((solicitud) => solicitud.id === id);
  }

  siguienteId(): number {
    const ids = this.todas().map((solicitud) => solicitud.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  guardar(solicitud: DatosSolicitud): void {
    const solicitudes = this.todas();
    const posicion = solicitudes.findIndex((existente) => existente.id === solicitud.id);
    if (posicion >= 0) solicitudes[posicion] = solicitud;
    else solicitudes.push(solicitud);
    this.archivo.escribir(solicitudes);
  }
}

@Injectable()
export class DirectorioEstudiantesJson extends DirectorioEstudiantes {
  private readonly archivo: ArchivoJson<Estudiante>;

  constructor(@Inject(DIRECTORIO_DATOS) directorio: string) {
    super();
    this.archivo = new ArchivoJson(path.join(directorio, 'estudiantes.json'));
  }

  buscarPorId(id: number): Estudiante | undefined {
    return this.archivo.leer().find((estudiante) => estudiante.id === id);
  }
}

@Injectable()
export class DirectorioResponsablesJson extends DirectorioResponsables {
  private readonly archivo: ArchivoJson<Responsable>;

  constructor(@Inject(DIRECTORIO_DATOS) directorio: string) {
    super();
    this.archivo = new ArchivoJson(path.join(directorio, 'responsables.json'));
  }

  buscarPorId(id: number): Responsable | undefined {
    return this.archivo.leer().find((responsable) => responsable.id === id);
  }
}
