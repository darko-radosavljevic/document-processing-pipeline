import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from '../services/documents.service';
import { DocumentStatus } from '../enums/enums';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            uploadFile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        destination: './uploads',
        filename: 'test-uuid.pdf',
        path: './uploads/test-uuid.pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      const mockDocument = {
        id: 'test-id',
        filename: 'test.pdf',
        path: 'test-uuid.pdf',
        status: DocumentStatus.UPLOADED,
        ocr_text: null,
        ocr_confidence: null,
        ocr_language: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'uploadFile').mockResolvedValue(mockDocument);

      const result = await controller.uploadFile(
        mockFile as Express.Multer.File,
      );

      expect(service.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockDocument);
    });
  });
});
