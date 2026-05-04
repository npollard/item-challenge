import type { Logger } from '../shared/logger.js';
import { failure, success, validationFailure } from '../shared/responses.js';
import { storage } from '../storage/index.js';
import { itemIdSchema, updateItemRequestSchema } from '../types/api.js';

export async function updateItemHandler(
  id: unknown,
  data: unknown,
  requestLogger: Logger
) {
  const idValidation = itemIdSchema.safeParse(id);
  if (!idValidation.success) {
    requestLogger.warn({ error: idValidation.error }, 'Validation failed');
    return validationFailure(idValidation.error);
  }

  const bodyValidation = updateItemRequestSchema.safeParse(data);
  if (!bodyValidation.success) {
    requestLogger.warn({ error: bodyValidation.error }, 'Validation failed');
    return validationFailure(bodyValidation.error);
  }

  const itemId = idValidation.data;
  const updateRequest = bodyValidation.data;

  try {
    const item = await storage.updateItem(itemId, updateRequest);

    if (!item) {
      requestLogger.warn({ itemId }, 'Item not found');
      return failure(404, 'Item not found');
    }

    requestLogger.info(
      { itemId, version: item.metadata.version },
      'Item updated'
    );

    return success(200, item);
  } catch (err) {
    requestLogger.error(
      { err, itemId, updateRequest },
      'Error updating item'
    );
    return failure(500, 'Internal server error');
  }
}
