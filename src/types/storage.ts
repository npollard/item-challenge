/**
 * Storage Types
 */

import { CreateItemRequest, ExamItem, ListItemsQuery, UpdateItemRequest } from './item.js';

export interface ItemStorage {
  createItem(data: CreateItemRequest): Promise<ExamItem>;
  getItem(id: string): Promise<ExamItem | null>;
  updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null>;
  listItems(query: ListItemsQuery): Promise<ListItemsResult>;
  createVersion(id: string): Promise<ExamItem | null>;
  getAuditTrail(id: string): Promise<ExamItem[]>;
}

export interface ListItemsResult {
  items: ExamItem[];
  total?: number;
  nextKey?: Record<string, any>;
}

export interface DynamoDBItem extends ExamItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
}