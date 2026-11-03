import { Injectable } from '@nestjs/common';
import { Reloj } from '../puertos/reloj';

@Injectable()
export class RelojDelSistema extends Reloj {
  ahora(): Date {
    return new Date();
  }
}
