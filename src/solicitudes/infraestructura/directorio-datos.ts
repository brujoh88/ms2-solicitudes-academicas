import * as path from 'path';

/** Token de inyección de la carpeta donde viven los archivos JSON. */
export const DIRECTORIO_DATOS = Symbol('DIRECTORIO_DATOS');

export const directorioDatosPorDefecto = () => path.join(process.cwd(), 'data');
