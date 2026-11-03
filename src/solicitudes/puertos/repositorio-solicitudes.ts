import { DatosSolicitud } from '../dominio/datos';

// Puertos de persistencia. Son clases abstractas y no interfaces porque NestJS
// necesita un valor en tiempo de ejecución para usarlas como token de inyección.

/** Lo que necesita quien solo consulta (por ejemplo, el reporte). */
export abstract class LectorSolicitudes {
  abstract todas(): DatosSolicitud[];
  abstract buscarPorId(id: number): DatosSolicitud | undefined;
}

/** Lo que necesita quien además registra y modifica solicitudes. */
export abstract class RepositorioSolicitudes extends LectorSolicitudes {
  abstract siguienteId(): number;
  abstract guardar(solicitud: DatosSolicitud): void;
}
