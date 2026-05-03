/**
 * Storage Factory
 *
 * Automatically selects the appropriate storage backend based on environment variables.
 * Defaults to in-memory storage for easy local development.
 */

import { ItemStorage } from './interface.js';
import { MemoryStorage } from './memory.js';
import { DynamoDBStorage } from './dynamodb.js';
import { logger } from '../shared/logger.js';

export function createStorage(): ItemStorage {
  if (process.env.USE_DYNAMODB === 'true') {
    logger.info('Using DynamoDB storage');
    return new DynamoDBStorage();
  }

  logger.info('Using in-memory storage');
  return new MemoryStorage();
}

// Singleton instance for shared state across handlers
export const storage = createStorage();

export * from './interface.js';
