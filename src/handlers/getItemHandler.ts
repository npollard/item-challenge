import { storage } from '../storage/index.js';
import { success, failure } from '../shared/responses.js';

export async function getItemHandler(id: string) {
  try {
    const item = await storage.getItem(id);

    if (!item) {
      return failure(404, 'Item not found');
    }

    return success(200, item);
  } catch (err) {
    console.error('Error getting item:', err);
    return failure(500, 'Internal server error');
  }
}
