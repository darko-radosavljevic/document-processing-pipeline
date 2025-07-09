import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  description?: string;
}
