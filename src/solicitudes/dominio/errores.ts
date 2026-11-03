/**
 * Una regla de negocio impide la operación (por ejemplo, la solicitud ya está
 * cerrada). El mensaje es para el usuario.
 */
export class ErrorDeNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** Los datos recibidos están incompletos, mal formados o apuntan a algo inexistente. */
export class DatosInvalidos extends ErrorDeNegocio {}

/** El recurso pedido no existe. */
export class RecursoNoEncontrado extends ErrorDeNegocio {}
