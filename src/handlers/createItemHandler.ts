import { storage } from '../storage/index.js';
import { success, failure } from '../shared/responses.js';
import { createItemRequestSchema } from '../types/item.js';
import { ZodError } from 'zod';

export async function createItemHandler(data: unknown) {
  try {
    const validatedData = createItemRequestSchema.parse(data);
    const item = await storage.createItem(validatedData);

    return success(201, item);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return failure(400, `Validation error: ${messages}`);
    }

    console.error('Error creating item:', err);
    return failure(500, 'Internal server error');
  }
}
