import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentStatus } from '../enums/enums';

/**
 * Document entity representing uploaded documents in the system.
 *
 * This entity stores information about documents that have been uploaded
 * for processing, including their file details, processing status,
 * OCR results, and validation information.
 */
@Entity()
export class Document {
  /**
   * Unique identifier for the document.
   * Generated as a UUID to ensure uniqueness across the system.
   */
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  /**
   * Original filename of the uploaded document.
   * Stored as provided by the user during upload.
   */
  @Column()
  public filename: string;

  /**
   * File system path where the document is stored.
   * Used to locate the physical file for processing operations.
   */
  @Column()
  public path: string;

  /**
   * Current processing status of the document.
   * Tracks the document through the processing pipeline:
   * - UPLOADED: Document has been uploaded but not yet processed
   * - PROCESSING: Document is currently being processed
   * - VALIDATED: Document has passed validation checks
   * - FAILED: Document processing has failed
   */
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  public status: DocumentStatus;

  /**
   * Extracted text content from the document via OCR processing.
   * Null if OCR has not been performed or failed.
   * Contains the full text content extracted from the document.
   */
  @Column('text', { nullable: true })
  public ocr_text: string | null;

  /**
   * Confidence score of the OCR processing result.
   * Value between 0.0 and 1.0, where 1.0 represents 100% confidence.
   * Null if OCR has not been performed or failed.
   */
  @Column({ type: 'float', nullable: true })
  public ocr_confidence: number | null;

  /**
   * Detected language of the document content.
   * Stored as a 2-letter ISO language code (e.g., 'en', 'es', 'fr').
   * Null if language detection failed or OCR has not been performed.
   */
  @Column({ type: 'varchar', length: 5, nullable: true })
  public ocr_language: string | null;

  /**
   * Validation errors encountered during document processing.
   * Contains detailed error messages if the document failed validation.
   * Null if no validation errors occurred or validation has not been performed.
   */
  @Column('text', { nullable: true })
  public validation_errors?: string | null;

  /**
   * Timestamp when the document was first created in the system.
   * Automatically set by TypeORM when the entity is persisted.
   */
  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt: Date;

  /**
   * Timestamp when the document was last updated.
   * Automatically updated by TypeORM whenever the entity is modified.
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt: Date;
}
