/** La hora actual, inyectable para que los cálculos de plazos se puedan probar. */
export abstract class Reloj {
  abstract ahora(): Date;
}
