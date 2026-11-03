import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ArchivoJson } from '../../src/solicitudes/infraestructura/archivo-json';
import { RepositorioSolicitudesJson } from '../../src/solicitudes/infraestructura/repositorios-json';
import { solicitud } from '../dobles/en-memoria';

// Ahora la carpeta de datos se inyecta: estas pruebas usan una carpeta temporal
// y no tocan los datos reales (la version inicial no lo permitia).
let carpeta: string;
beforeEach(() => (carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'))));
afterEach(() => fs.rmSync(carpeta, { recursive: true, force: true }));

describe('ArchivoJson', () => {
  it('un archivo que no existe es una lista vacia', () => {
    expect(new ArchivoJson(path.join(carpeta, 'no-existe.json')).leer()).toEqual([]);
  });

  it('un archivo danado lanza error en vez de ocultarlo (antes devolvia lista vacia)', () => {
    const ruta = path.join(carpeta, 'danado.json');
    fs.writeFileSync(ruta, '[{ "id": 1,');
    expect(() => new ArchivoJson(ruta).leer()).toThrow(SyntaxError);
  });
});

describe('RepositorioSolicitudesJson', () => {
  it('empieza en el id 1, guarda, actualiza sin duplicar y relee del disco', () => {
    const repositorio = new RepositorioSolicitudesJson(carpeta);
    expect(repositorio.siguienteId()).toBe(1);

    repositorio.guardar(solicitud({ id: 1 }));
    repositorio.guardar(solicitud({ id: 1, responsableId: 10 }));

    const otraInstancia = new RepositorioSolicitudesJson(carpeta);
    expect(otraInstancia.todas()).toHaveLength(1);
    expect(otraInstancia.buscarPorId(1).responsableId).toBe(10);
    expect(otraInstancia.siguienteId()).toBe(2);
  });
});
