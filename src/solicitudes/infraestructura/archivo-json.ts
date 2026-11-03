import * as fs from 'fs';

/**
 * Un archivo JSON que guarda una lista. Reemplaza el bloque de lectura que estaba
 * copiado seis veces en el controlador.
 *
 * Diferencia con la versión inicial: si el archivo no existe, la lista está
 * vacía (igual que antes); si existe pero está dañado, se lanza el error en vez
 * de tragarlo y seguir como si no hubiera datos.
 */
export class ArchivoJson<T> {
  constructor(private readonly ruta: string) {}

  leer(): T[] {
    if (!fs.existsSync(this.ruta)) return [];
    return JSON.parse(fs.readFileSync(this.ruta, 'utf-8'));
  }

  escribir(elementos: T[]): void {
    fs.writeFileSync(this.ruta, JSON.stringify(elementos, null, 2));
  }
}
