// Pruebas de las correcciones de la revision de codigo (docs/code-review/).
import { HttpStatus } from '@nestjs/common';
import {
  DatosInvalidos,
  ErrorDeNegocio,
  RecursoNoEncontrado,
} from '../../src/solicitudes/dominio/errores';
import { Solicitud } from '../../src/solicitudes/dominio/solicitud';
import { codigoPara } from '../../src/solicitudes/errores-de-negocio.filter';
import { ReporteService } from '../../src/solicitudes/aplicacion/reporte.service';
import { AHORA, RelojFijo, RepositorioEnMemoria, solicitud } from '../dobles/en-memoria';

describe('CR1: cada tipo de error tiene su codigo HTTP', () => {
  it.each([
    [new RecursoNoEncontrado('x'), HttpStatus.NOT_FOUND],
    [new DatosInvalidos('x'), HttpStatus.BAD_REQUEST],
    [new ErrorDeNegocio('x'), HttpStatus.CONFLICT],
  ])('%s responde %i', (error, codigo) => {
    expect(codigoPara(error)).toBe(codigo);
  });
});

describe('CR5: el reporte tolera un tipo que no esta en la tabla', () => {
  it('lo cuenta aparte en vez de devolver NaN', () => {
    const repositorio = new RepositorioEnMemoria([solicitud({ tipo: 'BECA' })]);
    const reporte = new ReporteService(repositorio, new RelojFijo(AHORA)).generar();
    expect(reporte.porTipo.BECA).toBe(1);
    expect(reporte.porTipo.CERTIFICADO).toBe(0);
  });
});

describe('CR6: un tipo desconocido en los datos guardados', () => {
  it('es una falla interna con un mensaje claro, no un error del usuario', () => {
    const s = Solicitud.desde(solicitud({ tipo: 'BECA' }));
    expect(() => s.tipoDeSolicitud()).toThrow('Tipo de solicitud desconocido en los datos: BECA');
    expect(() => s.tipoDeSolicitud()).not.toThrow(ErrorDeNegocio);
  });
});
