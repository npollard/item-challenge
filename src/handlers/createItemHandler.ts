import { storage } from '../storage/index.js';
import { success, failure, validationFailure } from '../shared/responses.js';
import { createItemRequestSchema } from '../types/item.js';
import { logger } from '../shared/logger.js';

export async function createItemHandler(data: unknown) {
  const validationResult = createItemRequestSchema.safeParse(data);
  if (!validationResult.success) {
    return validationFailure(validationResult.error);
  }

  try {
    const item = await storage.createItem(validationResult.data);

    return success(201, item);
  } catch (err) {
    logger.error(err, 'Error creating item');
    return failure(500, 'Internal server error');
  }
}