/** Una regla de negocio impide la operación. El mensaje es para el usuario. */
export class ErrorDeNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeNegocio';
  }
}
