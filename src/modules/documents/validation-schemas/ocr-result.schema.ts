import { z } from 'zod';

export const OCRResultSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  language: z.string(),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;
