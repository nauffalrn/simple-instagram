import { z } from 'zod';

// Skema untuk guard
export const GuardSchema = z
  .string()
  .min(1, 'Token harus ada')
  .refine((val) => {
    return val.startsWith('Bearer ') && val.length > 7;
  }, 'Token harus bearer');
