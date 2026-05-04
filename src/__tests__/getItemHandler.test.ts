import { beforeEach, describe, expect, it, vi } from "vitest";
import { getItemHandler } from "../handlers/getItemHandler.js";
import type { Logger } from "../shared/logger.js";
import * as storageModule from "../storage/index.js";

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as Logger;

const mockStorage = {
  createItem: vi.fn(),
  getItem: vi.fn(),
  updateItem: vi.fn(),
  listItems: vi.fn(),
  createVersion: vi.fn(),
  getAuditTrail: vi.fn(),
};

// Mock storage module
vi.spyOn(storageModule, "storage", "get").mockReturnValue(mockStorage as any);

describe("getItemHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 for existing item", async () => {
    const mockItem = {
      id: "test-id-123",
      subject: "AP Calculus",
      itemType: "free-response" as const,
      difficulty: 4,
      content: {
        question: "Calculate the derivative...",
        correctAnswer: "42",
        explanation: "Using the chain rule...",
      },
      metadata: {
        author: "test-author",
        status: "approved" as const,
        tags: ["calculus", "derivatives"],
        created: Date.now(),
        lastModified: Date.now(),
        version: 1,
      },
      securityLevel: "standard" as const,
    };
    mockStorage.getItem.mockResolvedValue(mockItem);

    const result = await getItemHandler("test-id-123", mockLogger);

    expect(result.statusCode).toBe(200);
    expect(result.body).toHaveProperty("id", "test-id-123");
  });

  it("should return 404 when storage returns null", async () => {
    mockStorage.getItem.mockResolvedValue(null);

    const result = await getItemHandler("non-existent-id", mockLogger);

    expect(result.statusCode).toBe(404);
    expect(result.body).toHaveProperty("error", "Item not found");
  });
});