import { logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { createItemRequestSchema } from '../types/api.js';

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