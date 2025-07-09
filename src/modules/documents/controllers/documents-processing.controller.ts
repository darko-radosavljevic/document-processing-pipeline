import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { DocumentsService } from '../services/documents.service';
import { DocumentEventType, DocumentStatus } from '../enums/enums';
import { OCRResultSchema } from '../validation-schemas/ocr-result.schema';

/**
 * Controller responsible for handling document processing and validation events
 * from the message queue. This controller acts as a worker that processes
 * documents asynchronously through OCR and validation stages.
 */
@Controller()
export class DocumentsProcessingController {
  private readonly logger = new Logger(DocumentsProcessingController.name);

  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Handles document processing events from the message queue.
   * This method simulates OCR processing and updates document status accordingly.
   *
   * Processing Flow:
   * 1. Retrieve document from database
   * 2. Update status to PROCESSING
   * 3. Simulate OCR processing
   * 4. Update document with OCR results
   * 5. Emit validation event for next stage
   * 6. Acknowledge message to remove from queue
   *
   * @param data - Contains the documentId to process
   * @param context - RabbitMQ context for message acknowledgment
   */
  @EventPattern(DocumentEventType.DOCUMENT_PROCESSING)
  async handleProcessing(
    @Payload() data: { documentId: string },
    @Ctx() context: RmqContext,
  ) {
    // Get RabbitMQ channel and original message for acknowledgment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const { documentId } = data;
      this.logger.log(`Processing document: ${documentId}`);

      // Retrieve document from database
      const document = await this.documentsService.findOne(documentId);

      // If document not found, acknowledge message to prevent infinite retries
      if (!document) {
        this.logger.warn(
          `Document ${documentId} not found, acknowledging message`,
        );
        channel.ack(originalMsg);
        return;
      }

      // Update document status to indicate processing has started
      await this.documentsService.update(documentId, {
        status: DocumentStatus.PROCESSING,
      });

      // Simulate OCR processing (in real implementation, this would call actual OCR service)
      const ocrResult = await this.documentsService.simulateOCR();

      // Update document with OCR results and mark as ready for validation
      await this.documentsService.update(documentId, {
        ocr_text: ocrResult.text,
        ocr_confidence: ocrResult.confidence,
        ocr_language: ocrResult.language,
        status: DocumentStatus.VALIDATED,
      });

      this.logger.log(`Document ${documentId} processed successfully`);

      // Emit validation event to trigger the next stage in the pipeline
      this.documentsService.emitValidationEvent(documentId);

      // Acknowledge message to remove it from the queue
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Error processing document: ${error.message}`,
        error.stack,
      );
      // Reject message and requeue for retry (false = don't requeue, true = requeue)
      channel.nack(originalMsg, false, true);
    }
  }

  /**
   * Handles document validation events from the message queue.
   * This method validates OCR results against predefined schemas and updates
   * document status based on validation outcome.
   *
   * Validation Flow:
   * 1. Retrieve document with OCR results
   * 2. Validate OCR results against schema
   * 3. Update document status based on validation result
   * 4. Log validation outcome
   * 5. Acknowledge message to remove from queue
   *
   * @param data - Contains the documentId to validate
   * @param context - RabbitMQ context for message acknowledgment
   */
  @EventPattern(DocumentEventType.DOCUMENT_VALIDATION)
  async handleValidation(
    @Payload() data: { documentId: string },
    @Ctx() context: RmqContext,
  ) {
    // Get RabbitMQ channel and original message for acknowledgment
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const { documentId } = data;
      this.logger.log(`Validating document: ${documentId}`);

      // Retrieve document with OCR results from database
      const document = await this.documentsService.findOne(documentId);

      // If document not found, acknowledge message to prevent infinite retries
      if (!document) {
        this.logger.warn(
          `Document ${documentId} not found, acknowledging message`,
        );
        channel.ack(originalMsg);
        return;
      }

      // Validate OCR results against the predefined schema
      const validatedResult = OCRResultSchema.safeParse({
        text: document.ocr_text,
        confidence: document.ocr_confidence,
        language: document.ocr_language,
      });

      // Handle validation failure
      if (!validatedResult.success) {
        // Update document status to FAILED and store validation errors
        await this.documentsService.update(documentId, {
          status: DocumentStatus.FAILED,
          validation_errors: validatedResult.error.issues
            .map((el) => el.message)
            .join(','),
        });

        this.logger.warn(
          `Document ${documentId} validation failed: ${validatedResult.error.message}`,
        );
      } else {
        // Update document status to VALIDATED and clear any previous errors
        await this.documentsService.update(documentId, {
          status: DocumentStatus.VALIDATED,
          validation_errors: null,
        });

        this.logger.log(`Document ${documentId} validated successfully`);
      }

      // Acknowledge message to remove it from the queue
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Error validating document: ${error.message}`,
        error.stack,
      );
      // Reject message and requeue for retry (false = don't requeue, true = requeue)
      channel.nack(originalMsg, false, true);
    }
  }
}
