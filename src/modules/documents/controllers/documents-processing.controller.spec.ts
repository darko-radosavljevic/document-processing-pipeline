import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { DocumentsProcessingController } from './documents-processing.controller';
import { DocumentsService } from '../services/documents.service';
import { DocumentStatus } from '../enums/enums';

describe('DocumentsProcessingController', () => {
  let controller: DocumentsProcessingController;
  let service: DocumentsService;

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockMessage = {
    content: Buffer.from('test'),
    properties: {},
  };

  const mockContext = {
    getChannelRef: jest.fn().mockReturnValue(mockChannel),
    getMessage: jest.fn().mockReturnValue(mockMessage),
  } as unknown as RmqContext;

  const mockDocument = {
    id: 'test-document-id',
    filename: 'test.pdf',
    path: 'test-uuid.pdf',
    status: DocumentStatus.UPLOADED,
    ocr_text: null,
    ocr_confidence: null,
    ocr_language: null,
    validation_errors: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOcrResult = {
    text: 'This is a simulated OCR result.',
    confidence: 0.98,
    language: 'en',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsProcessingController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            simulateOCR: jest.fn(),
            emitValidationEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsProcessingController>(
      DocumentsProcessingController,
    );
    service = module.get<DocumentsService>(DocumentsService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleProcessing', () => {
    const processingData = { documentId: 'test-document-id' };

    it('should process document successfully', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service, 'update').mockResolvedValue(mockDocument);
      jest.spyOn(service, 'simulateOCR').mockResolvedValue(mockOcrResult);
      jest.spyOn(service, 'emitValidationEvent').mockImplementation(() => {});

      // Act
      await controller.handleProcessing(processingData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).toHaveBeenNthCalledWith(1, 'test-document-id', {
        status: DocumentStatus.PROCESSING,
      });
      expect(service.update).toHaveBeenNthCalledWith(2, 'test-document-id', {
        ocr_text: mockOcrResult.text,
        ocr_confidence: mockOcrResult.confidence,
        ocr_language: mockOcrResult.language,
        status: DocumentStatus.VALIDATED,
      });

      expect(service.simulateOCR).toHaveBeenCalled();
      expect(service.emitValidationEvent).toHaveBeenCalledWith(
        'test-document-id',
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle document not found gracefully', async () => {
      // Arrange
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('Document not found'));

      // Act
      await controller.handleProcessing(processingData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).not.toHaveBeenCalled();
      expect(service.simulateOCR).not.toHaveBeenCalled();
      expect(service.emitValidationEvent).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle processing errors and requeue message', async () => {
      // Arrange
      const error = new Error('Processing failed');
      jest.spyOn(service, 'findOne').mockRejectedValue(error);

      // Act
      await controller.handleProcessing(processingData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle update errors and requeue message', async () => {
      // Arrange
      const error = new Error('Update failed');
      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service, 'update').mockRejectedValue(error);

      // Act
      await controller.handleProcessing(processingData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).toHaveBeenCalledWith('test-document-id', {
        status: DocumentStatus.PROCESSING,
      });
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });
  });

  describe('handleValidation', () => {
    const validationData = { documentId: 'test-document-id' };
    const documentWithOcr = {
      ...mockDocument,
      ocr_text: 'Valid OCR text',
      ocr_confidence: 0.95,
      ocr_language: 'en',
    };

    it('should validate document successfully', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(documentWithOcr);
      jest.spyOn(service, 'update').mockResolvedValue(documentWithOcr);

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).toHaveBeenCalledWith('test-document-id', {
        status: DocumentStatus.VALIDATED,
        validation_errors: null,
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle document not found gracefully', async () => {
      // Arrange
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('Document not found'));

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle validation failure and mark document as failed', async () => {
      // Arrange
      const documentWithInvalidOcr = {
        ...mockDocument,
        ocr_text: null, // Invalid: null text
        ocr_confidence: null, // Invalid: null confidence
        ocr_language: null, // Invalid: null language
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(documentWithInvalidOcr);
      jest.spyOn(service, 'update').mockResolvedValue(documentWithInvalidOcr);

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(service.update).toHaveBeenCalledWith('test-document-id', {
        status: DocumentStatus.FAILED,
        validation_errors: expect.stringContaining(
          'Expected string, received null',
        ),
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle validation errors and requeue message', async () => {
      // Arrange
      const error = new Error('Validation failed');
      jest.spyOn(service, 'findOne').mockRejectedValue(error);

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle update errors during validation and requeue message', async () => {
      // Arrange
      const error = new Error('Update failed');
      jest.spyOn(service, 'findOne').mockResolvedValue(documentWithOcr);
      jest.spyOn(service, 'update').mockRejectedValue(error);

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith('test-document-id');
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should validate OCR result schema correctly', async () => {
      // Arrange
      const documentWithValidOcr = {
        ...mockDocument,
        ocr_text: 'Valid OCR text with content',
        ocr_confidence: 0.85,
        ocr_language: 'en',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(documentWithValidOcr);
      jest.spyOn(service, 'update').mockResolvedValue(documentWithValidOcr);

      // Act
      await controller.handleValidation(validationData, mockContext);

      // Assert
      expect(service.update).toHaveBeenCalledWith('test-document-id', {
        status: DocumentStatus.VALIDATED,
        validation_errors: null,
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });
  });
});
