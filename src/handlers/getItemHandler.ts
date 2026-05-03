import { storage } from '../storage/index.js';
import { success, failure } from '../shared/responses.js';
import { itemIdSchema } from '../types/item.js';
import { ZodError } from 'zod';

export async function getItemHandler(id: unknown) {
  try {
    const validatedId = itemIdSchema.parse(id);
    const item = await storage.getItem(validatedId);

    if (!item) {
      return failure(404, 'Item not found');
    }

    return success(200, item);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return failure(400, `Validation error: ${messages}`);
    }

    console.error('Error getting item:', err);
    return failure(500, 'Internal server error');
  }
}
