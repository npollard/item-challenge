import { logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { itemIdSchema } from '../types/api.js';

export async function getItemHandler(id: unknown, requestLogger: typeof logger) {
  const validationResult = itemIdSchema.safeParse(id);
  if (!validationResult.success) {
    return validationFailure(validationResult.error);
  }

  const itemId = validationResult.data;

  try {
    const item = await storage.getItem(itemId);

    if (!item) {
      logger.warn({ itemId }, 'Item not found');
      return failure(404, 'Item not found');
    }

    logger.info({ itemId }, 'Item retrieved');

    return success(200, item);
  } catch (err) {
    logger.error({ err, itemId }, 'Error getting item');
    return failure(500, 'Internal server error');
  }
}
