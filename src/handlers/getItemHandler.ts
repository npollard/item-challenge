import { storage } from '../storage/index.js';
import { success, failure, validationFailure } from '../shared/responses.js';
import { itemIdSchema } from '../types/item.js';
import { logger } from '../shared/logger.js';

export async function getItemHandler(id: unknown) {
  const validationResult = itemIdSchema.safeParse(id);
  if (!validationResult.success) {
    return validationFailure(validationResult.error);
  }

  try {
    const item = await storage.getItem(validationResult.data);
    if (!item) {
      return failure(404, 'Item not found');
    }

    return success(200, item);
  } catch (err) {
    logger.error(err, 'Error getting item');
    return failure(500, 'Internal server error');
  }
}
