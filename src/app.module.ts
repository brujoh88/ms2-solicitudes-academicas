import { Module } from '@nestjs/common';
import { SolicitudesController } from './solicitudes.controller';

@Module({
  controllers: [SolicitudesController],
})
export class AppModule {}
