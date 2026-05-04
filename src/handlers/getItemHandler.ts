import type { Logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { itemIdSchema } from '../types/api.js';

export async function getItemHandler(id: unknown, requestLogger: Logger) {
  const validationResult = itemIdSchema.safeParse(id);
  if (!validationResult.success) {
    requestLogger.warn({ error: validationResult.error }, 'Validation failed');
    return validationFailure(validationResult.error);
  }

  const itemId = validationResult.data;

  try {
    const item = await storage.getItem(itemId);

    if (!item) {
      requestLogger.warn({ itemId }, 'Item not found');
      return failure(404, 'Item not found');
    }

    requestLogger.info({ itemId }, 'Item retrieved');

    return success(200, item);
  } catch (err) {
    requestLogger.error({ err, itemId }, 'Error getting item');
    return failure(500, 'Internal server error');
  }
}
