import { z } from 'zod';
import { ExamItem } from './item.js';

export const itemIdSchema = z.string().min(1, 'Item ID is required');

export const createItemRequestSchema = z.object({
  subject: z.string().min(1),
  itemType: z.enum(['multiple-choice', 'free-response', 'essay']),
  difficulty: z.number().int().min(1).max(5),
  content: z.object({
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1),
    explanation: z.string().min(1),
  }),
  metadata: z.object({
    author: z.string().min(1),
    status: z.enum(['draft', 'review', 'approved', 'archived']),
    tags: z.array(z.string()),
  }),
  securityLevel: z.enum(['standard', 'secure', 'highly-secure']),
});

export type CreateItemRequest = z.infer<typeof createItemRequestSchema>;

export const updateItemRequestSchema = createItemRequestSchema
  .partial()
  .extend({
    content: createItemRequestSchema.shape.content.partial().optional(),
    metadata: createItemRequestSchema.shape.metadata.partial().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateItemRequest = z.infer<typeof updateItemRequestSchema>;

export interface ListItemsQuery {
  limit?: number;
  offset?: number; // memory only
  nextKey?: Record<string, any>; // DynamoDB
  subject?: string; // memory only
  status?: string;  // memory only
}

export interface ListItemsResult {
  items: ExamItem[];
  total?: number; // memory only
  nextKey?: Record<string, any>;
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}