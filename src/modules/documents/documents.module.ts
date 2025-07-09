import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsProcessingController } from './controllers/documents-processing.controller';
import { Document } from './entities/document.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBITMQ_URL } from '../../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [RABBITMQ_URL],
          queue: 'document_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [DocumentsController, DocumentsProcessingController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
