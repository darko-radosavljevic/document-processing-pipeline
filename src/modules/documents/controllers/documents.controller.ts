import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MAX_FILE_SIZE, UPLOAD_DESTINATION } from '../../../config';

/**
 * Controller for handling document-related HTTP requests
 * Provides CRUD operations and file upload functionality for documents
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Creates a new document with the provided data
   * @param createDocumentDto - Data transfer object containing document creation information
   * @returns Promise resolving to the created document
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  /**
   * Retrieves all documents from the system
   * @returns Promise resolving to an array of all documents
   */
  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  /**
   * Retrieves a specific document by its unique identifier
   * @param id - The unique identifier of the document to retrieve
   * @returns Promise resolving to the requested document
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  /**
   * Updates an existing document with new data
   * @param id - The unique identifier of the document to update
   * @param updateDocumentDto - Data transfer object containing the fields to update
   * @returns Promise resolving to the updated document
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  /**
   * Removes a document from the system by its unique identifier
   * @param id - The unique identifier of the document to delete
   * @returns Promise resolving to void (204 No Content)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  /**
   * Handles file upload for document processing
   * Uses multer middleware for file handling with the following configuration:
   * - Stores files on disk at the configured upload destination
   * - Generates unique filenames using UUID to prevent conflicts
   * - Enforces maximum file size limits
   * - Preserves original file extensions
   *
   * @param file - The uploaded file object from multer
   * @returns Promise resolving to the upload result from the service
   * @throws BadRequestException if no file is provided in the request
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DESTINATION,
        filename: (req, file, cb) => {
          // Generate unique filename with original extension to prevent naming conflicts
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE, // Enforce maximum file size limit
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Validate that a file was actually uploaded
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process the uploaded file through the documents service
    return await this.documentsService.uploadFile(file);
  }
}
