import { logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { createItemRequestSchema } from '../types/api.js';

export async function createItemHandler(data: unknown, requestLogger: typeof logger) {
  const validationResult = createItemRequestSchema.safeParse(data);
  if (!validationResult.success) {
    return validationFailure(validationResult.error);
  }

  const request = validationResult.data;

  try {
    const item = await storage.createItem(request);

    logger.info({ itemId: item.id }, 'Item created');

    return success(201, item);
  } catch (err) {
    logger.error({ err }, 'Error creating item');
    return failure(500, 'Internal server error');
  }
}