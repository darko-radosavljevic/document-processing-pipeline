import { ConfigService } from '@nestjs/config';

// Create a config service instance to read environment variables
const configService = new ConfigService();

// File upload configuration
export const UPLOAD_DESTINATION =
  configService.get<string>('UPLOAD_DESTINATION') || './uploads';

export const MAX_FILE_SIZE =
  configService.get<number>('MAX_FILE_SIZE') || 10 * 1024 * 1024; // Default 10MB

export const RABBITMQ_URL =
  configService.get<string>('RABBITMQ_URL') ||
  'amqp://admin:admin@localhost:5672';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'text/plain',
];
