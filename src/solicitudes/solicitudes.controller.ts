import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ReporteService } from './aplicacion/reporte.service';
import { SolicitudesService } from './aplicacion/solicitudes.service';
import { ErrorDeNegocio } from './dominio/errores';

/** Traduce HTTP a casos de uso. No tiene reglas de negocio ni persistencia. */
@Controller('solicitudes')
export class SolicitudesController {
  constructor(
    private readonly servicio: SolicitudesService,
    private readonly reportes: ReporteService,
  ) {}

  @Get()
  listar(@Query() q: any) {
    return this.servicio.buscar(q);
  }

  @Get('reporte')
  reporte() {
    return this.reportes.generar();
  }

  @Get(':id')
  uno(@Param('id') id: string) {
    return this.responder(() => this.servicio.obtener(Number(id)));
  }

  @Post()
  registrar(@Body() b: any) {
    return this.responder(() => this.servicio.registrar(b));
  }

  @Put(':id/responsable')
  asignar(@Param('id') id: string, @Body() b: any) {
    return this.responder(() =>
      this.servicio.asignarResponsable(Number(id), Number(b.responsableId)),
    );
  }

  @Put(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() b: any) {
    return this.responder(() => this.servicio.cambiarEstado(Number(id), b.estado, b.motivo));
  }

  // Mantiene el comportamiento de la version inicial: el error va en el cuerpo
  // con el codigo de exito de la ruta.
  private responder<T>(accion: () => T): T | { error: string } {
    try {
      return accion();
    } catch (e) {
      if (e instanceof ErrorDeNegocio) return { error: e.message };
      throw e;
    }
  }
}
