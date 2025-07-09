import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { DocumentStatus } from '../enums/enums';

export class CreateDocumentDto {
  @IsString()
  filename: string;

  @IsString()
  path: string;

  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @IsOptional()
  @IsString()
  ocr_text?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ocr_confidence?: number;

  @IsOptional()
  @IsString()
  ocr_language?: string;

  @IsOptional()
  @IsString()
  validation_errors?: string | null;
}
