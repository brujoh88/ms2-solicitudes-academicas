import { Body, Controller, Get, Param, Post, Put, Query, UseFilters } from '@nestjs/common';
import { ReporteService } from './aplicacion/reporte.service';
import { SolicitudesService } from './aplicacion/solicitudes.service';
import { Estado } from './dominio/estado';
import { ErroresDeNegocioFilter } from './errores-de-negocio.filter';

/** Traduce HTTP a casos de uso. No tiene reglas de negocio ni persistencia. */
@Controller('solicitudes')
@UseFilters(ErroresDeNegocioFilter)
export class SolicitudesController {
  constructor(
    private readonly servicio: SolicitudesService,
    private readonly reportes: ReporteService,
  ) {}

  @Get()
  listar(@Query() consulta: Record<string, string>) {
    return this.servicio.buscar({
      estado: consulta.estado as Estado,
      tipo: consulta.tipo,
      responsableId: consulta.responsableId ? Number(consulta.responsableId) : undefined,
      estudianteId: consulta.estudianteId ? Number(consulta.estudianteId) : undefined,
      texto: consulta.texto,
    });
  }

  @Get('reporte')
  reporte() {
    return this.reportes.generar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(Number(id));
  }

  @Post()
  registrar(@Body() cuerpo: any) {
    return this.servicio.registrar({
      estudianteId: cuerpo.estudianteId ? Number(cuerpo.estudianteId) : undefined,
      tipo: cuerpo.tipo,
      descripcion: cuerpo.descripcion,
      urgente: cuerpo.urgente == true,
      canal: cuerpo.canal,
    });
  }

  @Put(':id/responsable')
  asignarResponsable(@Param('id') id: string, @Body() cuerpo: { responsableId: unknown }) {
    return this.servicio.asignarResponsable(Number(id), Number(cuerpo.responsableId));
  }

  @Put(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() cuerpo: { estado: string; motivo?: string }) {
    return this.servicio.cambiarEstado(Number(id), cuerpo.estado, cuerpo.motivo);
  }
}
