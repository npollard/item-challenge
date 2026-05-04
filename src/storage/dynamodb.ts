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
  GetCommand,
  QueryCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { CreateItemRequest, ListItemsQuery, ListItemsResult, UpdateItemRequest } from '../types/api.js';
import { ExamItem } from '../types/item.js';
import { DynamoDBItem, ItemStorage } from '../types/storage.js';

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

    const latest: DynamoDBItem = this.buildLatestItem(item);
    const version: DynamoDBItem = {
      ...item,
      PK: `ITEM#${id}`,
      SK: `VERSION#000001`,
    };

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: latest,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: version,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    }));

    return item;
  }

  async getItem(id: string): Promise<ExamItem | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `ITEM#${id}`, SK: 'LATEST' },
    }));

    if (!result.Item) return null;
    return this.stripKeys(result.Item as DynamoDBItem);
  }

  async getAuditTrail(id: string): Promise<ExamItem[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :v)',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${id}`,
        ':v': 'VERSION#',
      },
      ScanIndexForward: true,
    }));

    return (result.Items || []).map(i => this.stripKeys(i as DynamoDBItem));
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    const newVersion = existing.metadata.version + 1;
    const now = Date.now();

    const updated: ExamItem = {
      ...existing,
      ...data,
      id,
      content: data.content ? { ...existing.content, ...data.content } : existing.content,
      metadata: {
        ...existing.metadata,
        ...(data.metadata || {}),
        version: newVersion,
        lastModified: now,
      },
    };

    const versionSK = `VERSION#${newVersion.toString().padStart(6, '0')}`;

    const versionItem: DynamoDBItem = {
      ...updated,
      PK: `ITEM#${id}`,
      SK: versionSK,
    };

    const latestItem: DynamoDBItem = this.buildLatestItem(updated);

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: versionItem,
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: latestItem,
            ConditionExpression: 'metadata.version = :expectedVersion',
            ExpressionAttributeValues: {
              ':expectedVersion': existing.metadata.version,
            },
          },
        },
      ],
    }));

    return updated;
  }

  async listItems(query: ListItemsQuery): Promise<ListItemsResult> {
    if (query.offset) {
      console.warn("Offset pagination is not supported in DynamoDB; ignoring offset");
    }

    if (query.subject || query.status) {
      console.warn("Filtering by subject/status is not supported in DynamoDB without additional GSIs");
    }

    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#ITEM',
      },
      Limit: query.limit || 10,
      ExclusiveStartKey: query.nextKey,
      ScanIndexForward: false, // newest first
    }));

    return {
      items: (result.Items || []).map(i => this.stripKeys(i as DynamoDBItem)),
      nextKey: result.LastEvaluatedKey,
    };
  }

  async createVersion(id: string): Promise<ExamItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    const newVersion = existing.metadata.version + 1;
    const now = Date.now();

    const snapshot: ExamItem = {
      ...existing,
      metadata: {
        ...existing.metadata,
        version: newVersion,
        lastModified: now,
      },
    };

    const versionSK = `VERSION#${newVersion.toString().padStart(6, '0')}`;

    await this.client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.tableName,
            Item: {
              ...snapshot,
              PK: `ITEM#${id}`,
              SK: versionSK,
            },
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
          },
        },
        {
          Put: {
            TableName: this.tableName,
            Item: this.buildLatestItem(snapshot),
            ConditionExpression: 'metadata.version = :expectedVersion',
            ExpressionAttributeValues: {
              ':expectedVersion': existing.metadata.version,
            },
          },
        },
      ],
    }));

    return snapshot;
  }

  private buildLatestItem(item: ExamItem): DynamoDBItem {
    return {
      ...item,
      PK: `ITEM#${item.id}`,
      SK: 'LATEST',
      GSI1PK: 'ENTITY#ITEM',
      GSI1SK: `CREATED#${item.metadata.created}`,
    };
  }

  private stripKeys(item: DynamoDBItem): ExamItem {
    const { PK, SK, GSI1PK, GSI1SK, ...rest } = item;
    return rest;
  }
}