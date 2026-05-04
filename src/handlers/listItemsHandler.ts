import { failure } from '../shared/responses.js';

export async function listItemsHandler(query: Record<string, string>, logger: Logger) {
  // TODO: Implement listItemsHandler
  // - Parse query parameters (limit, offset, subject, status)
  // - Call storage.listItems(query)
  // - Return 200 with items array and total count
  return failure(501, 'Not implemented');
}
