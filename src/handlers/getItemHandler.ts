import { storage } from '../storage/index.js';
import { success, failure, validationFailure } from '../shared/responses.js';
import { itemIdSchema } from '../types/item.js';

export async function getItemHandler(id: unknown) {
  const parseResult = itemIdSchema.safeParse(id);
  if (!parseResult.success) {
    return validationFailure(parseResult.error);
  }

  try {
    const item = await storage.getItem(parseResult.data);
    if (!item) {
      return failure(404, 'Item not found');
    }

    return success(200, item);
  } catch (err) {
    console.error('Error getting item:', err);
    return failure(500, 'Internal server error');
  }
}
