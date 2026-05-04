/**
 * Storage Types
 */

import { CreateItemRequest, ExamItem, ListItemsQuery, UpdateItemRequest } from './item.js';

export interface ItemStorage {
  createItem(data: CreateItemRequest): Promise<ExamItem>;
  getItem(id: string): Promise<ExamItem | null>;
  updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null>;
  listItems(query: ListItemsQuery): Promise<{ items: ExamItem[]; total: number }>;
  createVersion(id: string): Promise<ExamItem | null>;
  getAuditTrail(id: string): Promise<ExamItem[]>;
}

export interface DynamoDBItem extends ExamItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
}