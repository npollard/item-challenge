import { beforeEach, describe, expect, it, vi } from "vitest";
import { createItemHandler } from "../handlers/createItemHandler.js";
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

describe("createItemHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create item with 201 and return item with id and version 1", async () => {
    const itemData = {
      subject: "AP Biology",
      itemType: "multiple-choice" as const,
      difficulty: 3,
      content: {
        question: "What is photosynthesis?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "Photosynthesis is the process...",
      },
      metadata: {
        author: "test-author",
        status: "draft" as const,
        tags: ["biology", "photosynthesis"],
      },
      securityLevel: "standard" as const,
    };

    const mockItem = {
      id: "test-id-123",
      ...itemData,
      metadata: { ...itemData.metadata, created: Date.now(), lastModified: Date.now(), version: 1 },
    };
    mockStorage.createItem.mockResolvedValue(mockItem);

    const result = await createItemHandler(itemData, mockLogger);

    expect(result.statusCode).toBe(201);
    expect(result.body).toHaveProperty("id", "test-id-123");
    expect(result.body).toHaveProperty("metadata");
    expect((result.body as any).metadata).toHaveProperty("version", 1);
  });

  it("should return 400 for invalid input", async () => {
    const invalidData = { subject: "" }; // Missing required fields

    const result = await createItemHandler(invalidData, mockLogger);

    expect(result.statusCode).toBe(400);
    expect(result.body).toHaveProperty("error");
  });
});