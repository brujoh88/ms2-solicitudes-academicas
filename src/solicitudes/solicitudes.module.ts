import { Module } from '@nestjs/common';
import { directorioDatosPorDefecto, DIRECTORIO_DATOS } from './infraestructura/directorio-datos';
import { RelojDelSistema } from './infraestructura/reloj-del-sistema';
import {
  DirectorioEstudiantesJson,
  DirectorioResponsablesJson,
  RepositorioSolicitudesJson,
} from './infraestructura/repositorios-json';
import { DirectorioEstudiantes, DirectorioResponsables } from './puertos/directorios';
import { Reloj } from './puertos/reloj';
import { LectorSolicitudes, RepositorioSolicitudes } from './puertos/repositorio-solicitudes';
import { ReporteService } from './aplicacion/reporte.service';
import { SolicitudesService } from './aplicacion/solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';

@Module({
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    ReporteService,
    { provide: DIRECTORIO_DATOS, useFactory: directorioDatosPorDefecto },
    { provide: RepositorioSolicitudes, useClass: RepositorioSolicitudesJson },
    { provide: LectorSolicitudes, useExisting: RepositorioSolicitudes },
    { provide: DirectorioEstudiantes, useClass: DirectorioEstudiantesJson },
    { provide: DirectorioResponsables, useClass: DirectorioResponsablesJson },
    { provide: Reloj, useClass: RelojDelSistema },
  ],
})
export class SolicitudesModule {}
