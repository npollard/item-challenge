import type { Logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { createItemRequestSchema } from '../types/api.js';

export async function createItemHandler(data: unknown, requestLogger: Logger) {
  const validationResult = createItemRequestSchema.safeParse(data);
  if (!validationResult.success) {
    requestLogger.warn({ error: validationResult.error }, 'Validation failed');
    return validationFailure(validationResult.error);
  }

  const createRequest = validationResult.data;

  try {
    const item = await storage.createItem(createRequest);

    requestLogger.info(
      { itemId: item.id, version: item.metadata.version },
      'Item created'
    );

    return success(201, item);
  } catch (err) {
    requestLogger.error({ err, createRequest }, 'Error creating item');
    return failure(500, 'Internal server error');
  }
}