import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateItemHandler } from "../handlers/updateItemHandler.js";
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

describe("updateItemHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 and increment version on valid update", async () => {
    const updateData = {
      subject: "Updated Subject",
      difficulty: 5,
    };

    const mockItem = {
      id: "test-id-123",
      subject: "Updated Subject",
      itemType: "free-response" as const,
      difficulty: 5,
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
        version: 2,
      },
      securityLevel: "standard" as const,
    };
    mockStorage.updateItem.mockResolvedValue(mockItem);

    const result = await updateItemHandler("test-id-123", updateData, mockLogger);

    expect(result.statusCode).toBe(200);
    expect(result.body).toHaveProperty("id", "test-id-123");
    expect(result.body).toHaveProperty("metadata");
    expect((result.body as any).metadata).toHaveProperty("version", 2);
  });

  it("should return 404 when storage returns null", async () => {
    mockStorage.updateItem.mockResolvedValue(null);

    const result = await updateItemHandler("non-existent-id", { subject: "Test" }, mockLogger);

    expect(result.statusCode).toBe(404);
    expect(result.body).toHaveProperty("error", "Item not found");
  });

  it("should merge partial content update preserving other fields", async () => {
    const updateData = {
      content: {
        question: "Updated question text",
      },
    };

    // Mock storage returning properly merged item
    const mockItem = {
      id: "test-id-123",
      subject: "AP Calculus", // unchanged
      itemType: "free-response" as const, // unchanged
      difficulty: 4, // unchanged
      content: {
        question: "Updated question text", // updated
        correctAnswer: "42", // unchanged
        explanation: "Using the chain rule...", // unchanged
      },
      metadata: {
        author: "test-author", // unchanged
        status: "approved" as const, // unchanged
        tags: ["calculus", "derivatives"], // unchanged
        created: Date.now(),
        lastModified: Date.now(),
        version: 2,
      },
      securityLevel: "standard" as const, // unchanged
    };
    mockStorage.updateItem.mockResolvedValue(mockItem);

    const result = await updateItemHandler("test-id-123", updateData, mockLogger);

    expect(result.statusCode).toBe(200);

    const body = result.body as typeof mockItem;

    // Assert content.question is updated
    expect(body.content.question).toBe("Updated question text");

    // Assert other content fields remain unchanged
    expect(body.content.correctAnswer).toBe("42");
    expect(body.content.explanation).toBe("Using the chain rule...");

    // Assert top-level fields remain unchanged
    expect(body.subject).toBe("AP Calculus");
    expect(body.itemType).toBe("free-response");
    expect(body.difficulty).toBe(4);
    expect(body.securityLevel).toBe("standard");
    expect(body.metadata.author).toBe("test-author");
    expect(body.metadata.status).toBe("approved");
    expect(body.metadata.tags).toEqual(["calculus", "derivatives"]);
  });

  it("should return 400 for empty payload", async () => {
    const result = await updateItemHandler("test-id-123", {}, mockLogger);

    expect(result.statusCode).toBe(400);
    expect(result.body).toHaveProperty("error");
    expect((result.body as any).error).toContain("At least one field must be provided");
  });
});
