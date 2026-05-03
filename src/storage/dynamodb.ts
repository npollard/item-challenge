/**
 * DynamoDB Storage Implementation (Optional)
 *
 * This implementation uses AWS DynamoDB for persistent storage.
 *
 * To use this:
 * 1. Set environment variable: USE_DYNAMODB=true
 * 2. Configure AWS credentials (or use DynamoDB Local)
 * 3. Set DYNAMODB_TABLE_NAME (or use default "ExamItems")
 *
 * For DynamoDB Local:
 * - Download from: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
 * - Run: java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
 * - Set DYNAMODB_ENDPOINT=http://localhost:8000
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ExamItem, CreateItemRequest, UpdateItemRequest, ListItemsQuery } from '../types/item.js';
import { ItemStorage } from './interface.js';

// DynamoDB item with composite keys
interface DynamoDBItem extends ExamItem {
  PK: string;  // ITEM#<id>
  SK: string;  // METADATA or VERSION#<n>
  GSI1PK?: string;  // SUBJECT#<subject>
  GSI1SK?: string;  // METADATA
  GSI2PK?: string;  // STATUS#<status>
  GSI2SK?: string;  // METADATA
}

export class DynamoDBStorage implements ItemStorage {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'ExamItems';
  }

  async createItem(data: CreateItemRequest): Promise<ExamItem> {
    const now = Date.now();
    const id = randomUUID();
    const item: ExamItem = {
      id,
      ...data,
      metadata: {
        ...data.metadata,
        created: now,
        lastModified: now,
        version: 1,
      },
    };

    const dbItem: DynamoDBItem = {
      ...item,
      PK: `ITEM#${id}`,
      SK: 'METADATA',
      GSI1PK: `SUBJECT#${data.subject}`,
      GSI1SK: 'METADATA',
      GSI2PK: `STATUS#${data.metadata.status}`,
      GSI2SK: 'METADATA',
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: dbItem,
    }));

    return item;
  }

  async getItem(id: string): Promise<ExamItem | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `ITEM#${id}`, SK: 'METADATA' },
    }));

    if (!result.Item) return null;
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...item } = result.Item as DynamoDBItem;
    return item as ExamItem;
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    // First, save current version to history
    const versionToArchive: DynamoDBItem = {
      ...existing,
      PK: `ITEM#${id}`,
      SK: `VERSION#${existing.metadata.version}`,
    };

    const updated: ExamItem = {
      ...existing,
      ...data,
      id,
      content: data.content ? { ...existing.content, ...data.content } : existing.content,
      metadata: {
        ...existing.metadata,
        ...(data.metadata || {}),
        lastModified: Date.now(),
        version: existing.metadata.version + 1,
      },
    };

    const updatedDbItem: DynamoDBItem = {
      ...updated,
      PK: `ITEM#${id}`,
      SK: 'METADATA',
      GSI1PK: `SUBJECT#${updated.subject}`,
      GSI1SK: 'METADATA',
      GSI2PK: `STATUS#${updated.metadata.status}`,
      GSI2SK: 'METADATA',
    };

    // Archive old version and update current in one batch
    await this.client.send(new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: [
          { PutRequest: { Item: versionToArchive } },
          { PutRequest: { Item: updatedDbItem } },
        ],
      },
    }));

    return updated;
  }

  async listItems(query: ListItemsQuery): Promise<{ items: ExamItem[]; total: number }> {
    // Query by subject using GSI1 if subject filter provided
    if (query.subject) {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :subject AND GSI1SK = :metadata',
        ExpressionAttributeValues: {
          ':subject': `SUBJECT#${query.subject}`,
          ':metadata': 'METADATA',
        },
        Limit: query.limit || 10,
      }));

      const items = (result.Items || []).map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanItem } = item as DynamoDBItem;
        return cleanItem as ExamItem;
      });
      return { items, total: result.Count || 0 };
    }

    // Query by status using GSI2 if status filter provided
    if (query.status) {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :status AND GSI2SK = :metadata',
        ExpressionAttributeValues: {
          ':status': `STATUS#${query.status}`,
          ':metadata': 'METADATA',
        },
        Limit: query.limit || 10,
      }));

      const items = (result.Items || []).map(item => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanItem } = item as DynamoDBItem;
        return cleanItem as ExamItem;
      });
      return { items, total: result.Count || 0 };
    }

    // Query all current items (SK = METADATA)
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1', // Use GSI1 to get all items
      KeyConditionExpression: 'GSI1SK = :metadata',
      ExpressionAttributeValues: {
        ':metadata': 'METADATA',
      },
      Limit: query.limit || 10,
    }));

    const items = (result.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanItem } = item as DynamoDBItem;
      return cleanItem as ExamItem;
    });
    return { items, total: result.Count || 0 };
  }

  async createVersion(id: string): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    // Create a new version snapshot
    const newVersion: ExamItem = {
      ...existing,
      metadata: {
        ...existing.metadata,
        version: existing.metadata.version + 1,
        lastModified: Date.now(),
      },
    };

    // Archive current and update
    const versionToArchive: DynamoDBItem = {
      ...existing,
      PK: `ITEM#${id}`,
      SK: `VERSION#${existing.metadata.version}`,
    };

    const updatedDbItem: DynamoDBItem = {
      ...newVersion,
      PK: `ITEM#${id}`,
      SK: 'METADATA',
      GSI1PK: `SUBJECT#${newVersion.subject}`,
      GSI1SK: 'METADATA',
      GSI2PK: `STATUS#${newVersion.metadata.status}`,
      GSI2SK: 'METADATA',
    };

    await this.client.send(new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: [
          { PutRequest: { Item: versionToArchive } },
          { PutRequest: { Item: updatedDbItem } },
        ],
      },
    }));

    return newVersion;
  }

  async getAuditTrail(id: string): Promise<ExamItem[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :versionPrefix)',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${id}`,
        ':versionPrefix': 'VERSION#',
      },
      ScanIndexForward: true, // Oldest first
    }));

    return (result.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...cleanItem } = item as DynamoDBItem;
      return cleanItem as ExamItem;
    });
  }
}
