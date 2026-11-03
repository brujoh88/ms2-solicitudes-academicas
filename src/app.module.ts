import { Module } from '@nestjs/common';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [SolicitudesModule],
})
export class AppModule {}
