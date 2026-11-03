import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DatosInvalidos, ErrorDeNegocio, RecursoNoEncontrado } from './dominio/errores';

/**
 * Único lugar donde un error de negocio se convierte en respuesta HTTP.
 *
 * Corrección CR1 de la revisión: la versión inicial respondía 200/201 con el
 * error en el cuerpo. Ahora cada tipo de error tiene su código.
 */
@Catch(ErrorDeNegocio)
export class ErroresDeNegocioFilter implements ExceptionFilter {
  catch(error: ErrorDeNegocio, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(codigoPara(error))
      .json({ error: error.message });
  }
}

export function codigoPara(error: ErrorDeNegocio): HttpStatus {
  if (error instanceof RecursoNoEncontrado) return HttpStatus.NOT_FOUND;
  if (error instanceof DatosInvalidos) return HttpStatus.BAD_REQUEST;
  return HttpStatus.CONFLICT;
}
