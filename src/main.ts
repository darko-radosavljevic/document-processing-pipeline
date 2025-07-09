import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RABBITMQ_URL } from './config';

async function bootstrap() {
  // Create the main HTTP application
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Connect the microservice to the HTTP app
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_URL],
      queue: 'document_queue',
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Start the microservice
  await app.startAllMicroservices();

  const config = new DocumentBuilder()
    .setTitle('Document Management API')
    .setDescription('API for managing documents')
    .setVersion('1.0')
    .addTag('documents')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // Start the HTTP server on port 3000
  await app.listen(3000);
}

bootstrap()
  .then(() => {
    console.log('Application is running on: http://localhost:3000');
    console.log('RabbitMQ microservice is connected');
    console.log(
      'Listening to events: document_processing, document_validation',
    );
  })
  .catch((err) => {
    console.error(err);
  });
