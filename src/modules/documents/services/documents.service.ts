import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { ClientProxy } from '@nestjs/microservices';
import { OCRResult } from '../validation-schemas/ocr-result.schema';
import { DocumentEventType, DocumentStatus } from '../enums/enums';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../../config';

/**
 * Service responsible for managing document operations including CRUD operations,
 * file uploads, and integration with document processing microservices.
 *
 * This service handles:
 * - Document metadata storage and retrieval
 * - File upload validation and processing
 * - Integration with RabbitMQ for async document processing
 * - OCR simulation for testing purposes
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) {}

  /**
   * Creates a new document record in the database
   *
   * @param createDocumentDto - Data transfer object containing document metadata
   * @returns Promise<Document> - The created document entity
   */
  async create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    const document = this.documentRepository.create(createDocumentDto);
    return await this.documentRepository.save(document);
  }

  /**
   * Retrieves all documents from the database, ordered by creation date (newest first)
   *
   * @returns Promise<Document[]> - Array of all document entities
   */
  async findAll(): Promise<Document[]> {
    return await this.documentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single document by its unique identifier
   *
   * @param id - The unique identifier of the document
   * @returns Promise<Document> - The found document entity
   * @throws NotFoundException - When document with the specified ID doesn't exist
   */
  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  /**
   * Updates an existing document with new metadata
   *
   * @param id - The unique identifier of the document to update
   * @param updateDocumentDto - Data transfer object containing updated document metadata
   * @returns Promise<Document> - The updated document entity
   * @throws NotFoundException - When document with the specified ID doesn't exist
   */
  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    const document = await this.findOne(id);
    Object.assign(document, updateDocumentDto);
    return await this.documentRepository.save(document);
  }

  /**
   * Permanently removes a document from the database
   *
   * @param id - The unique identifier of the document to delete
   * @throws NotFoundException - When document with the specified ID doesn't exist
   */
  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.documentRepository.remove(document);
  }

  /**
   * Handles file upload process including validation, database storage, and async processing
   *
   * This method performs the following steps:
   * 1. Validates that a file was actually uploaded
   * 2. Checks if the file type is supported (based on MIME type)
   * 3. Validates file size against configured limits
   * 4. Creates a document record in the database with UPLOADED status
   * 5. Emits a document processing event to RabbitMQ for async processing
   *
   * @param file - The uploaded file object from Multer
   * @returns Promise<Document> - The created document entity
   * @throws BadRequestException - When file validation fails or database operation fails
   */
  async uploadFile(file: Express.Multer.File): Promise<Document> {
    // Validate that a file was actually uploaded
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type against allowed MIME types
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size using configurable limit from config
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      throw new BadRequestException(`File size exceeds ${maxSizeMB}MB limit`);
    }

    try {
      // Create document record in database with initial UPLOADED status
      const document = this.documentRepository.create({
        filename: file.originalname,
        path: file.filename, // Multer-generated filename
        status: DocumentStatus.UPLOADED,
      });

      const savedDocument = await this.documentRepository.save(document);

      // Emit document processing event to RabbitMQ for async processing
      // This triggers the document processing pipeline (OCR, validation, etc.)
      this.rabbitClient.emit(DocumentEventType.DOCUMENT_PROCESSING, {
        documentId: savedDocument.id,
      });

      return savedDocument;
    } catch (error) {
      // Log the error for debugging purposes
      this.logger.error('Failed to save document record', error);
      throw new BadRequestException('Failed to save document record');
    }
  }

  /**
   * Simulates OCR processing for testing purposes
   *
   * This method creates a mock OCR result with a 500ms delay to simulate
   * real-world OCR processing time. Used primarily for testing and development.
   *
   * @returns Promise<OCRResult> - Simulated OCR result with text, confidence, and language
   */
  async simulateOCR(): Promise<OCRResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const ocrResult = {
          text: 'This is a simulated OCR result.',
          confidence: 0.98,
          language: 'en',
        };

        resolve(ocrResult);
      }, 500);
    });
  }

  /**
   * Emits a document validation event to RabbitMQ
   *
   * This method is used by the microservice controller to trigger
   * document validation processing after OCR completion.
   *
   * @param documentId - The unique identifier of the document to validate
   */
  emitValidationEvent(documentId: string): void {
    this.rabbitClient.emit(DocumentEventType.DOCUMENT_VALIDATION, {
      documentId,
    });
  }
}
