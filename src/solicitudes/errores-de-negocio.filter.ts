import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorDeNegocio } from './dominio/errores';

/**
 * Único lugar donde un error de negocio se convierte en respuesta HTTP.
 *
 * Por ahora conserva el comportamiento de la versión inicial (el error en el
 * cuerpo con el código de éxito de la ruta), que es lo que fijan los tests de
 * caracterización. Corregirlo es un cambio de comportamiento visible y se hace
 * aparte, en la revisión de código.
 */
@Catch(ErrorDeNegocio)
export class ErroresDeNegocioFilter implements ExceptionFilter {
  catch(error: ErrorDeNegocio, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const pedido = http.getRequest<Request>();
    const estado = pedido.method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
    http.getResponse<Response>().status(estado).json({ error: error.message });
  }
}
