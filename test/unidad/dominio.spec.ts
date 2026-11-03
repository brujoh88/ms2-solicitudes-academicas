import { Estado, esCerrado, TRANSICIONES } from '../../src/solicitudes/dominio/estado';
import { ErrorDeNegocio } from '../../src/solicitudes/dominio/errores';
import { Prioridad, subirUnNivel } from '../../src/solicitudes/dominio/prioridad';
import { tieneLargoMinimo } from '../../src/solicitudes/dominio/reglas';
import { Solicitud } from '../../src/solicitudes/dominio/solicitud';
import { buscarTipo, TIPOS_DE_SOLICITUD } from '../../src/solicitudes/dominio/tipo-solicitud';
import { AHORA, solicitud } from '../dobles/en-memoria';

describe('Prioridad', () => {
  it.each([
    [Prioridad.BAJA, Prioridad.MEDIA],
    [Prioridad.MEDIA, Prioridad.ALTA],
    [Prioridad.ALTA, Prioridad.ALTA],
  ])('%s sube a %s', (desde, hasta) => {
    expect(subirUnNivel(desde)).toBe(hasta);
  });
});

describe('Estados y transiciones', () => {
  it('solo RESUELTA y RECHAZADA son estados cerrados', () => {
    const cerrados = Object.values(Estado).filter(esCerrado);
    expect(cerrados).toEqual([Estado.RESUELTA, Estado.RECHAZADA]);
  });

  it('todo estado tiene su fila en la tabla de transiciones', () => {
    expect(Object.keys(TRANSICIONES).sort()).toEqual(Object.values(Estado).sort());
  });
});

describe('Tabla de tipos', () => {
  it('los codigos no se repiten', () => {
    const codigos = TIPOS_DE_SOLICITUD.map((t) => t.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('todo tipo tiene un plazo positivo', () => {
    for (const tipo of TIPOS_DE_SOLICITUD) expect(tipo.plazoEnDias).toBeGreaterThan(0);
  });

  it('solo el reclamo de nota admite estudiantes libres', () => {
    const admiten = TIPOS_DE_SOLICITUD.filter((t) => t.admiteEstudiantesLibres);
    expect(admiten.map((t) => t.codigo)).toEqual(['RECLAMO_NOTA']);
  });

  it('un codigo desconocido no es un tipo', () => {
    expect(buscarTipo('BECA')).toBeUndefined();
  });
});

describe('Largo minimo de un texto', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['  123456789  ', false],
    ['1234567890', true],
  ])('%j cumple: %s', (texto, cumple) => {
    expect(tieneLargoMinimo(texto)).toBe(cumple);
  });
});

describe('Solicitud', () => {
  describe('vencimiento', () => {
    it('vence cuando la fecha limite ya paso y sigue abierta', () => {
      const s = Solicitud.desde(solicitud({ fechaLimite: '2026-11-03T11:59:59.000Z' }));
      expect(s.estaVencida(AHORA)).toBe(true);
    });

    it('no vence en el instante exacto del limite', () => {
      const s = Solicitud.desde(solicitud({ fechaLimite: AHORA.toISOString() }));
      expect(s.estaVencida(AHORA)).toBe(false);
    });

    it('una cerrada nunca esta vencida', () => {
      const s = Solicitud.desde(
        solicitud({ estado: Estado.RESUELTA, fechaLimite: '2026-10-01T00:00:00.000Z' }),
      );
      expect(s.estaVencida(AHORA)).toBe(false);
    });
  });

  describe('dias de resolucion', () => {
    it('cuenta los dias entre el alta y la resolucion', () => {
      const s = Solicitud.desde(
        solicitud({
          estado: Estado.RESUELTA,
          historial: [
            { estado: Estado.PENDIENTE, fecha: '2026-11-01T12:00:00.000Z' },
            { estado: Estado.RESUELTA, fecha: '2026-11-02T00:00:00.000Z' },
          ],
        }),
      );
      expect(s.diasDeResolucion()).toBe(0.5);
    });

    it('es null si no esta resuelta', () => {
      expect(Solicitud.desde(solicitud()).diasDeResolucion()).toBeNull();
    });
  });

  describe('cambio de estado', () => {
    it('registra el cambio en el historial con la fecha y el motivo recortado', () => {
      const s = Solicitud.desde(solicitud());
      s.cambiarEstado(Estado.RECHAZADA, '  Documentacion incompleta ', AHORA);
      expect(s.estado).toBe(Estado.RECHAZADA);
      expect(s.aDatos().historial.at(-1)).toEqual({
        estado: Estado.RECHAZADA,
        fecha: AHORA.toISOString(),
        motivo: 'Documentacion incompleta',
      });
    });

    it('rechaza una transicion que no esta en la tabla', () => {
      const s = Solicitud.desde(solicitud());
      expect(() => s.cambiarEstado(Estado.RESUELTA, undefined, AHORA)).toThrow(
        new ErrorDeNegocio('No se puede pasar de PENDIENTE a RESUELTA'),
      );
    });

    it('no pasa a revision sin responsable', () => {
      const s = Solicitud.desde(solicitud());
      expect(() => s.cambiarEstado(Estado.EN_REVISION, undefined, AHORA)).toThrow(
        'No se puede revisar una solicitud sin responsable',
      );
    });

    it('un error no deja la solicitud a medio cambiar', () => {
      const s = Solicitud.desde(solicitud());
      expect(() => s.cambiarEstado(Estado.RECHAZADA, 'corto', AHORA)).toThrow(ErrorDeNegocio);
      expect(s.estado).toBe(Estado.PENDIENTE);
      expect(s.aDatos().historial).toHaveLength(1);
    });
  });

  describe('filtro', () => {
    const s = Solicitud.desde(solicitud({ responsableId: 10 }));

    it('un filtro vacio coincide con todo', () => {
      expect(s.coincideCon({})).toBe(true);
    });

    it('exige que coincidan todos los criterios', () => {
      expect(s.coincideCon({ tipo: 'CERTIFICADO', responsableId: 10 })).toBe(true);
      expect(s.coincideCon({ tipo: 'CERTIFICADO', responsableId: 20 })).toBe(false);
    });

    it('busca texto sin distinguir mayusculas', () => {
      expect(s.coincideCon({ texto: 'ALUMNO' })).toBe(true);
    });
  });

  it('aDatos devuelve una copia: modificarla no altera la solicitud', () => {
    const s = Solicitud.desde(solicitud());
    s.aDatos().historial.push({ estado: Estado.RESUELTA, fecha: AHORA.toISOString() });
    expect(s.aDatos().historial).toHaveLength(1);
  });
});
