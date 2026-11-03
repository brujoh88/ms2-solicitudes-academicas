// Tests de caracterizacion: registran como se comporta HOY el sistema, con sus
// defectos incluidos, para poder refactorizar sin cambiar el comportamiento externo.
// Si un refactoring rompe uno de estos tests, cambio algo que el usuario ve.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// "Ahora" fijo: el reporte calcula las vencidas contra la fecha actual.
const AHORA = new Date('2026-11-03T12:00:00.000Z');
const DATA = path.join(process.cwd(), 'data');
let respaldo: string;
let app: INestApplication;

beforeAll(() => {
  // El sistema lee y escribe ./data directamente: no hay forma de pasarle otro
  // archivo, asi que se respalda el real y se restaura despues de cada test.
  respaldo = fs.mkdtempSync(path.join(os.tmpdir(), 'solicitudes-'));
  fs.cpSync(DATA, respaldo, { recursive: true });
  jest.useFakeTimers({
    now: AHORA,
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
    ],
  });
});

beforeEach(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = modulo.createNestApplication();
  await app.init();
});

afterEach(async () => {
  await app.close();
  fs.cpSync(respaldo, DATA, { recursive: true });
});

afterAll(() => {
  jest.useRealTimers();
  fs.rmSync(respaldo, { recursive: true, force: true });
});

const leerSolicitudes = () =>
  JSON.parse(fs.readFileSync(path.join(DATA, 'solicitudes.json'), 'utf-8'));

const registrar = (cuerpo: object) =>
  request(app.getHttpServer()).post('/solicitudes').send(cuerpo);

describe('Buscar y filtrar', () => {
  it('lista todas las solicitudes sin filtros', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes');
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('filtra por estado', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes?estado=PENDIENTE');
    expect(res.body.map((s) => s.id)).toEqual([5, 6, 8]);
  });

  it('combina filtros de tipo y responsable', async () => {
    const res = await request(app.getHttpServer()).get(
      '/solicitudes?tipo=RECLAMO_NOTA&responsableId=3',
    );
    expect(res.body.map((s) => s.id)).toEqual([3, 7]);
  });

  it('busca texto sin distinguir mayusculas', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes?texto=CERTIFICADO');
    expect(res.body.map((s) => s.id)).toEqual([1, 5, 6, 8]);
  });

  it('devuelve una solicitud por id', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes/4');
    expect(res.body.estado).toBe('RECHAZADA');
  });

  it('DEFECTO REGISTRADO: una solicitud inexistente responde 200 con un error en el cuerpo', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes/99');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error: 'No existe la solicitud' });
  });
});

describe('Registrar solicitud', () => {
  it('crea la solicitud pendiente con prioridad y plazo segun el tipo', async () => {
    const res = await registrar({
      estudianteId: 2,
      tipo: 'EQUIVALENCIA',
      descripcion: '  Equivalencia de Base de Datos 1  ',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 9,
      estudianteId: 2,
      tipo: 'EQUIVALENCIA',
      descripcion: 'Equivalencia de Base de Datos 1',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      responsableId: null,
      canal: 'WEB',
      fechaAlta: '2026-11-03T12:00:00.000Z',
      fechaLimite: '2026-11-23T12:00:00.000Z',
    });
    expect(res.body.historial).toEqual([
      { estado: 'PENDIENTE', fecha: '2026-11-03T12:00:00.000Z' },
    ]);
    expect(leerSolicitudes()).toHaveLength(9);
  });

  it.each([
    ['CERTIFICADO', 'BAJA', '2026-11-05T12:00:00.000Z'],
    ['EQUIVALENCIA', 'MEDIA', '2026-11-23T12:00:00.000Z'],
    ['CAMBIO_COMISION', 'ALTA', '2026-11-06T12:00:00.000Z'],
    ['RECLAMO_NOTA', 'ALTA', '2026-11-08T12:00:00.000Z'],
  ])('%s tiene prioridad %s y vence el %s', async (tipo, prioridad, fechaLimite) => {
    const res = await registrar({ estudianteId: 1, tipo, descripcion: 'Descripcion valida' });
    expect(res.body.prioridad).toBe(prioridad);
    expect(res.body.fechaLimite).toBe(fechaLimite);
  });

  it.each([
    ['CERTIFICADO', 'MEDIA'],
    ['EQUIVALENCIA', 'ALTA'],
    ['RECLAMO_NOTA', 'ALTA'],
  ])('urgente sube un nivel la prioridad de %s a %s', async (tipo, prioridad) => {
    const res = await registrar({
      estudianteId: 1,
      tipo,
      descripcion: 'Descripcion valida',
      urgente: true,
    });
    expect(res.body.prioridad).toBe(prioridad);
  });

  it('respeta el canal informado', async () => {
    const res = await registrar({
      estudianteId: 1,
      tipo: 'CERTIFICADO',
      descripcion: 'Descripcion valida',
      canal: 'PRESENCIAL',
    });
    expect(res.body.canal).toBe('PRESENCIAL');
  });

  it('un estudiante libre puede reclamar una nota', async () => {
    const res = await registrar({
      estudianteId: 3,
      tipo: 'RECLAMO_NOTA',
      descripcion: 'Reclamo por la nota del final',
    });
    expect(res.body.estado).toBe('PENDIENTE');
  });

  it.each([
    [{ tipo: 'CERTIFICADO', descripcion: 'Descripcion valida' }, 'Falta el estudiante'],
    [{ estudianteId: 1, descripcion: 'Descripcion valida' }, 'Falta el tipo'],
    [{ estudianteId: 1, tipo: 'BECA', descripcion: 'Descripcion valida' }, 'Tipo invalido'],
    [
      { estudianteId: 1, tipo: 'CERTIFICADO', descripcion: '  corta   ' },
      'La descripcion debe tener al menos 10 caracteres',
    ],
    [
      { estudianteId: 99, tipo: 'CERTIFICADO', descripcion: 'Descripcion valida' },
      'El estudiante no existe',
    ],
    [
      { estudianteId: 3, tipo: 'CERTIFICADO', descripcion: 'Descripcion valida' },
      'Solo los estudiantes regulares pueden iniciar este tramite',
    ],
  ])('DEFECTO REGISTRADO: rechaza %j con 201 y "%s"', async (cuerpo, error) => {
    const res = await registrar(cuerpo);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ error });
    expect(leerSolicitudes()).toHaveLength(8);
  });
});

describe('Asignar responsable', () => {
  const asignar = (id: number, responsableId: number) =>
    request(app.getHttpServer())
      .put(`/solicitudes/${id}/responsable`)
      .send({ responsableId });

  it('asigna un responsable del area que atiende el tipo', async () => {
    const res = await asignar(5, 2);
    expect(res.body.responsableId).toBe(2);
    expect(leerSolicitudes().find((s) => s.id === 5).responsableId).toBe(2);
  });

  it.each([
    ['CAMBIO_COMISION', 1, 3],
    ['RECLAMO_NOTA', 3, 1],
    ['EQUIVALENCIA', 3, 2],
  ])('%s lo atiende el responsable %i y no el %i', async (tipo, delArea, deOtraArea) => {
    const { body } = await registrar({ estudianteId: 1, tipo, descripcion: 'Descripcion valida' });
    expect((await asignar(body.id, deOtraArea)).body).toEqual({
      error: 'El responsable no pertenece al area que atiende este tipo',
    });
    expect((await asignar(body.id, delArea)).body.responsableId).toBe(delArea);
  });

  it.each([
    [5, 3, 'El responsable no pertenece al area que atiende este tipo'],
    [5, 4, 'El responsable no esta activo'],
    [5, 99, 'El responsable no existe'],
    [1, 1, 'La solicitud ya esta cerrada'],
    [99, 1, 'No existe la solicitud'],
  ])('solicitud %i con responsable %i: "%s"', async (id, responsableId, error) => {
    const res = await asignar(id, responsableId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error });
  });

  it('no deja que un responsable tenga mas de 5 solicitudes abiertas', async () => {
    // Ana Paredes (3) ya tiene 3 abiertas: la 2, la 6 y la 7.
    const nuevas = [];
    for (const estudianteId of [1, 2, 4]) {
      const res = await registrar({
        estudianteId,
        tipo: 'EQUIVALENCIA',
        descripcion: 'Equivalencia para el limite',
      });
      nuevas.push(res.body.id);
    }
    expect((await asignar(nuevas[0], 3)).body.responsableId).toBe(3);
    expect((await asignar(nuevas[1], 3)).body.responsableId).toBe(3);
    expect((await asignar(nuevas[2], 3)).body).toEqual({
      error: 'El responsable ya tiene 5 solicitudes abiertas',
    });
    // Reasignar una que ya es suya no cuenta contra el limite.
    expect((await asignar(6, 3)).body.responsableId).toBe(3);
  });
});

describe('Cambiar estado', () => {
  const cambiar = (id: number, cuerpo: object) =>
    request(app.getHttpServer()).put(`/solicitudes/${id}/estado`).send(cuerpo);

  it('pasa de PENDIENTE a EN_REVISION si tiene responsable, y lo registra en el historial', async () => {
    const res = await cambiar(6, { estado: 'EN_REVISION' });
    expect(res.body.estado).toBe('EN_REVISION');
    expect(res.body.historial.at(-1)).toEqual({
      estado: 'EN_REVISION',
      fecha: '2026-11-03T12:00:00.000Z',
    });
  });

  it('no pasa a EN_REVISION sin responsable', async () => {
    const res = await cambiar(5, { estado: 'EN_REVISION' });
    expect(res.body).toEqual({ error: 'No se puede revisar una solicitud sin responsable' });
  });

  it('pasa de EN_REVISION a RESUELTA', async () => {
    const res = await cambiar(7, { estado: 'RESUELTA' });
    expect(res.body.estado).toBe('RESUELTA');
  });

  it('rechaza con motivo y guarda el motivo recortado', async () => {
    const res = await cambiar(5, { estado: 'RECHAZADA', motivo: '  Falta la documentacion  ' });
    expect(res.body.estado).toBe('RECHAZADA');
    expect(res.body.historial.at(-1).motivo).toBe('Falta la documentacion');
  });

  it('rechaza desde EN_REVISION con motivo', async () => {
    const res = await cambiar(7, { estado: 'RECHAZADA', motivo: 'La nota fue bien calculada' });
    expect(res.body.estado).toBe('RECHAZADA');
  });

  it.each([
    [5, { estado: 'RECHAZADA' }],
    [7, { estado: 'RECHAZADA', motivo: 'corto' }],
  ])('no rechaza la %i sin un motivo de 10 caracteres', async (id, cuerpo) => {
    const res = await cambiar(id, cuerpo);
    expect(res.body).toEqual({
      error: 'Para rechazar hay que indicar un motivo de al menos 10 caracteres',
    });
  });

  it.each([
    [5, 'RESUELTA', 'PENDIENTE'],
    [1, 'EN_REVISION', 'RESUELTA'],
    [4, 'PENDIENTE', 'RECHAZADA'],
  ])('no permite pasar la %i a %s desde %s', async (id, estado, desde) => {
    const res = await cambiar(id, { estado });
    expect(res.body).toEqual({ error: `No se puede pasar de ${desde} a ${estado}` });
  });
});

describe('Reporte', () => {
  it('cuenta por estado y tipo, lista las vencidas y promedia los dias de resolucion', async () => {
    const res = await request(app.getHttpServer()).get('/solicitudes/reporte');
    expect(res.body).toEqual({
      total: 8,
      porEstado: { PENDIENTE: 3, EN_REVISION: 2, RESUELTA: 2, RECHAZADA: 1 },
      porTipo: { CERTIFICADO: 3, EQUIVALENCIA: 2, CAMBIO_COMISION: 1, RECLAMO_NOTA: 2 },
      vencidas: [2, 5],
      promedioDiasResolucion: 2.5,
    });
  });
});
