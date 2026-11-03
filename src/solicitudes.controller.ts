import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import * as fs from 'fs';

// Controlador de solicitudes academicas
@Controller('solicitudes')
export class SolicitudesController {
  // listar solicitudes con filtros
  @Get()
  listar(@Query() q: any) {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    let res = data;
    if (q.estado) res = res.filter((s) => s.estado == q.estado);
    if (q.tipo) res = res.filter((s) => s.tipo == q.tipo);
    if (q.responsableId) res = res.filter((s) => s.responsableId == q.responsableId);
    if (q.estudianteId) res = res.filter((s) => s.estudianteId == q.estudianteId);
    if (q.texto)
      res = res.filter(
        (s) => s.descripcion.toLowerCase().indexOf(q.texto.toLowerCase()) >= 0,
      );
    return res;
  }

  // reporte basico
  @Get('reporte')
  reporte() {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    const r: any = {
      total: data.length,
      porEstado: { PENDIENTE: 0, EN_REVISION: 0, RESUELTA: 0, RECHAZADA: 0 },
      porTipo: { CERTIFICADO: 0, EQUIVALENCIA: 0, CAMBIO_COMISION: 0, RECLAMO_NOTA: 0 },
      vencidas: [],
      promedioDiasResolucion: null,
    };
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i++) {
      const s = data[i];
      r.porEstado[s.estado]++;
      r.porTipo[s.tipo]++;
      if (
        s.estado != 'RESUELTA' &&
        s.estado != 'RECHAZADA' &&
        new Date(s.fechaLimite).getTime() < new Date().getTime()
      ) {
        r.vencidas.push(s.id);
      }
      if (s.estado == 'RESUELTA') {
        // buscar la fecha en que se resolvio
        for (let j = 0; j < s.historial.length; j++) {
          if (s.historial[j].estado == 'RESUELTA') {
            const d =
              (new Date(s.historial[j].fecha).getTime() - new Date(s.fechaAlta).getTime()) /
              86400000;
            sum = sum + d;
            n++;
          }
        }
      }
    }
    if (n > 0) r.promedioDiasResolucion = Math.round((sum / n) * 10) / 10;
    return r;
  }

  @Get(':id')
  uno(@Param('id') id: string) {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    const s = data.find((x) => x.id == id);
    if (!s) return { error: 'No existe la solicitud' };
    return s;
  }

  // registrar una solicitud nueva
  @Post()
  registrar(@Body() b: any) {
    // validaciones
    if (!b.estudianteId) return { error: 'Falta el estudiante' };
    if (!b.tipo) return { error: 'Falta el tipo' };
    if (
      b.tipo != 'CERTIFICADO' &&
      b.tipo != 'EQUIVALENCIA' &&
      b.tipo != 'CAMBIO_COMISION' &&
      b.tipo != 'RECLAMO_NOTA'
    )
      return { error: 'Tipo invalido' };
    if (!b.descripcion || b.descripcion.trim().length < 10)
      return { error: 'La descripcion debe tener al menos 10 caracteres' };

    // el estudiante tiene que existir
    let ests = [];
    try {
      ests = JSON.parse(fs.readFileSync('./data/estudiantes.json', 'utf-8'));
    } catch (e) {}
    const est = ests.find((e) => e.id == b.estudianteId);
    if (!est) return { error: 'El estudiante no existe' };
    // los libres solo pueden reclamar notas
    if (est.condicion != 'REGULAR' && b.tipo != 'RECLAMO_NOTA')
      return { error: 'Solo los estudiantes regulares pueden iniciar este tramite' };

    // prioridad segun el tipo
    let p;
    switch (b.tipo) {
      case 'RECLAMO_NOTA':
        p = 'ALTA';
        break;
      case 'CAMBIO_COMISION':
        p = 'ALTA';
        break;
      case 'EQUIVALENCIA':
        p = 'MEDIA';
        break;
      default:
        p = 'BAJA';
    }
    // si es urgente sube un nivel
    if (b.urgente == true) {
      if (p == 'BAJA') p = 'MEDIA';
      else if (p == 'MEDIA') p = 'ALTA';
    }

    // plazo en dias segun el tipo
    let dias;
    switch (b.tipo) {
      case 'RECLAMO_NOTA':
        dias = 5;
        break;
      case 'CAMBIO_COMISION':
        dias = 3;
        break;
      case 'EQUIVALENCIA':
        dias = 20;
        break;
      case 'CERTIFICADO':
        dias = 2;
        break;
    }

    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    const hoy = new Date();
    const s = this.crear(
      data.length ? Math.max(...data.map((x) => x.id)) + 1 : 1,
      b.estudianteId,
      b.tipo,
      b.descripcion.trim(),
      p,
      hoy.toISOString(),
      new Date(hoy.getTime() + dias * 86400000).toISOString(),
      b.canal || 'WEB',
    );
    data.push(s);
    fs.writeFileSync('./data/solicitudes.json', JSON.stringify(data, null, 2));
    return s;
  }

  crear(id, estudianteId, tipo, descripcion, prioridad, fechaAlta, fechaLimite, canal) {
    return {
      id: id,
      estudianteId: Number(estudianteId),
      tipo: tipo,
      descripcion: descripcion,
      prioridad: prioridad,
      estado: 'PENDIENTE',
      responsableId: null,
      fechaAlta: fechaAlta,
      fechaLimite: fechaLimite,
      canal: canal,
      historial: [{ estado: 'PENDIENTE', fecha: fechaAlta }],
    };
  }

  // asignar un responsable
  @Put(':id/responsable')
  asignar(@Param('id') id: string, @Body() b: any) {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    const s = data.find((x) => x.id == id);
    if (!s) return { error: 'No existe la solicitud' };
    if (s.estado == 'RESUELTA' || s.estado == 'RECHAZADA')
      return { error: 'La solicitud ya esta cerrada' };

    let resps = [];
    try {
      resps = JSON.parse(fs.readFileSync('./data/responsables.json', 'utf-8'));
    } catch (e) {}
    const r = resps.find((x) => x.id == b.responsableId);
    if (!r) return { error: 'El responsable no existe' };
    if (!r.activo) return { error: 'El responsable no esta activo' };

    // cada tipo lo atiende un area
    let area;
    switch (s.tipo) {
      case 'CERTIFICADO':
        area = 'BEDELIA';
        break;
      case 'CAMBIO_COMISION':
        area = 'BEDELIA';
        break;
      case 'EQUIVALENCIA':
        area = 'DEPARTAMENTO_ACADEMICO';
        break;
      case 'RECLAMO_NOTA':
        area = 'DEPARTAMENTO_ACADEMICO';
        break;
    }
    if (r.area != area) return { error: 'El responsable no pertenece al area que atiende este tipo' };

    // no mas de 5 abiertas por responsable
    let c = 0;
    for (let i = 0; i < data.length; i++) {
      if (
        data[i].responsableId == r.id &&
        (data[i].estado == 'PENDIENTE' || data[i].estado == 'EN_REVISION') &&
        data[i].id != s.id
      )
        c++;
    }
    if (c >= 5) return { error: 'El responsable ya tiene 5 solicitudes abiertas' };

    s.responsableId = r.id;
    fs.writeFileSync('./data/solicitudes.json', JSON.stringify(data, null, 2));
    return s;
  }

  // cambiar el estado
  @Put(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() b: any) {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync('./data/solicitudes.json', 'utf-8'));
    } catch (e) {
      data = [];
    }
    const s = data.find((x) => x.id == id);
    if (!s) return { error: 'No existe la solicitud' };
    const nuevo = b.estado;
    let ok = false;
    if (s.estado == 'PENDIENTE') {
      if (nuevo == 'EN_REVISION') {
        if (s.responsableId == null)
          return { error: 'No se puede revisar una solicitud sin responsable' };
        ok = true;
      } else if (nuevo == 'RECHAZADA') {
        if (!b.motivo || b.motivo.trim().length < 10)
          return { error: 'Para rechazar hay que indicar un motivo de al menos 10 caracteres' };
        ok = true;
      }
    } else if (s.estado == 'EN_REVISION') {
      if (nuevo == 'RESUELTA') {
        ok = true;
      } else if (nuevo == 'RECHAZADA') {
        if (!b.motivo || b.motivo.trim().length < 10)
          return { error: 'Para rechazar hay que indicar un motivo de al menos 10 caracteres' };
        ok = true;
      }
    }
    if (!ok) return { error: 'No se puede pasar de ' + s.estado + ' a ' + nuevo };

    s.estado = nuevo;
    const h: any = { estado: nuevo, fecha: new Date().toISOString() };
    if (b.motivo) h.motivo = b.motivo.trim();
    s.historial.push(h);
    fs.writeFileSync('./data/solicitudes.json', JSON.stringify(data, null, 2));
    return s;
  }
}
