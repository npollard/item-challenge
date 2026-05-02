import { storage } from '../storage/index.js';
import { success, failure } from '../shared/responses.js';

export async function createItemHandler(data: any) {
  try {
    // TODO: Add validation using Zod
    const item = await storage.createItem(data);

    return success(201, item);
  } catch (err) {
    console.error('Error creating item:', err);
    return failure(500, 'Internal server error');
  }
}
