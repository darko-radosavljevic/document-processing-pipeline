import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from '../entities/document.entity';
import { DocumentStatus, DocumentEventType } from '../enums/enums';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentRepository: any;
  let mockRabbitClient: any;

  beforeEach(async () => {
    // Create mock repository
    mockDocumentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    // Create mock RabbitMQ client
    mockRabbitClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: 'RABBITMQ_SERVICE',
          useValue: mockRabbitClient,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all documents ordered by createdAt DESC', async () => {
      const expectedDocuments = [
        { id: '1', filename: 'test1.pdf' },
        { id: '2', filename: 'test2.pdf' },
      ];

      mockDocumentRepository.find.mockResolvedValue(expectedDocuments);

      const result = await service.findAll();

      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(expectedDocuments);
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const documentId = '1';
      const expectedDocument = { id: documentId, filename: 'test.pdf' };

      mockDocumentRepository.findOne.mockResolvedValue(expectedDocument);

      const result = await service.findOne(documentId);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: documentId },
      });
      expect(result).toEqual(expectedDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = '999';

      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(documentId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: documentId },
      });
    });
  });

  describe('remove', () => {
    it('should remove a document', async () => {
      const documentId = '1';
      const existingDocument = { id: documentId, filename: 'test.pdf' };

      mockDocumentRepository.findOne.mockResolvedValue(existingDocument);
      mockDocumentRepository.remove.mockResolvedValue(undefined);

      await service.remove(documentId);

      expect(mockDocumentRepository.remove).toHaveBeenCalledWith(
        existingDocument,
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload a valid file successfully', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        filename: 'test-123.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const expectedDocument = {
        id: '1',
        filename: mockFile.originalname,
        path: mockFile.filename,
        status: DocumentStatus.UPLOADED,
      };

      mockDocumentRepository.create.mockReturnValue(expectedDocument);
      mockDocumentRepository.save.mockResolvedValue(expectedDocument);

      const result = await service.uploadFile(mockFile);

      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        filename: mockFile.originalname,
        path: mockFile.filename,
        status: DocumentStatus.UPLOADED,
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith(
        DocumentEventType.DOCUMENT_PROCESSING,
        {
          documentId: expectedDocument.id,
        },
      );
      expect(result).toEqual(expectedDocument);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(service.uploadFile(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const mockFile = {
        originalname: 'test.txt',
        filename: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      await expect(service.uploadFile(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const documentId = '1';
      const updateData = {
        status: DocumentStatus.VALIDATED,
      };
      const existingDocument = {
        id: documentId,
        filename: 'test.pdf',
        status: DocumentStatus.UPLOADED,
      };
      const updatedDocument = { ...existingDocument, ...updateData };

      mockDocumentRepository.findOne.mockResolvedValue(existingDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);

      const result = await service.update(documentId, updateData);

      expect(mockDocumentRepository.save).toHaveBeenCalledWith(updatedDocument);
      expect(result).toEqual(updatedDocument);
    });
  });

  describe('simulateOCR', () => {
    it('should return OCR result after delay', async () => {
      const result = await service.simulateOCR();

      expect(result).toEqual({
        text: 'This is a simulated OCR result.',
        confidence: 0.98,
        language: 'en',
      });
    });
  });

  describe('emitValidationEvent', () => {
    it('should emit validation event', () => {
      const documentId = '1';

      service.emitValidationEvent(documentId);

      expect(mockRabbitClient.emit).toHaveBeenCalledWith(
        DocumentEventType.DOCUMENT_VALIDATION,
        {
          documentId,
        },
      );
    });
  });
});
