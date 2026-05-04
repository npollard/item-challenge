import {
  CreateItemRequest,
  ListItemsQuery,
  ListItemsResult,
  UpdateItemRequest,
} from './api.js';
import { ExamItem } from './item.js';

export interface ItemStorage {
  createItem(data: CreateItemRequest): Promise<ExamItem>;
  getItem(id: string): Promise<ExamItem | null>;
  updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null>;
  listItems(query: ListItemsQuery): Promise<ListItemsResult>;
  createVersion(id: string): Promise<ExamItem | null>;
  getAuditTrail(id: string): Promise<ExamItem[]>;
}

/**
 * DynamoDB persistence shape (internal only)
 */
export interface DynamoDBItem extends ExamItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
}