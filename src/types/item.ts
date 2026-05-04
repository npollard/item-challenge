/**
 * Exam Item Types
 */

import { z } from 'zod';

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

export interface ExamItem {
  id: string;
  subject: string; // e.g., "AP Biology", "AP Calculus"
  itemType: string; // "multiple-choice", "free-response", "essay"
  difficulty: number; // 1-5
  content: {
    question: string;
    options?: string[]; // For multiple choice
    correctAnswer: string;
    explanation: string;
  };
  metadata: {
    author: string;
    created: number; // timestamp
    lastModified: number; // timestamp
    version: number;
    status: string; // "draft", "review", "approved", "archived"
    tags: string[];
  };
  securityLevel: string; // "standard", "secure", "highly-secure"
}

export interface UpdateItemRequest {
  subject?: string;
  itemType?: string;
  difficulty?: number;
  content?: Partial<ExamItem["content"]>;
  metadata?: Partial<ExamItem["metadata"]>;
  securityLevel?: string;
}

export interface ListItemsQuery {
  limit?: number;
  offset?: number;
  nextKey?: Record<string, any>;
  subject?: string;
  status?: string;
}
