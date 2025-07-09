export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  VALIDATED = 'validated',
  FAILED = 'failed',
}

export enum DocumentEventType {
  DOCUMENT_PROCESSING = 'document_processing',
  DOCUMENT_VALIDATION = 'document_validation',
}
