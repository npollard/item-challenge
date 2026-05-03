import { storage } from '../storage/index.js';
import { success, failure, validationFailure } from '../shared/responses.js';
import { createItemRequestSchema } from '../types/item.js';

export async function createItemHandler(data: unknown) {
  const parseResult = createItemRequestSchema.safeParse(data);
  if (!parseResult.success) {
    return validationFailure(parseResult.error);
  }

  try {
    const item = await storage.createItem(parseResult.data);

    return success(201, item);
  } catch (err) {
    console.error('Error creating item:', err);
    return failure(500, 'Internal server error');
  }
}