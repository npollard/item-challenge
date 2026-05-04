import { describe, expect, it, vi } from "vitest";
import { createItemHandler } from "../handlers/createItemHandler.js";
import type { Logger } from "../shared/logger.js";

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as Logger;

describe("createItemHandler", () => {
  it("should create an item successfully", async () => {
    const itemData = {
      subject: "AP Biology",
      itemType: "multiple-choice",
      difficulty: 3,
      content: {
        question: "What is photosynthesis?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "Photosynthesis is the process...",
      },
      metadata: {
        author: "test-author",
        status: "draft",
        tags: ["biology", "photosynthesis"],
      },
      securityLevel: "standard",
    };

    const result = await createItemHandler(itemData, mockLogger);

    expect(result.statusCode).toBe(201);
    expect(result.body).toHaveProperty("id");
    if ("subject" in result.body) {
      expect(result.body.subject).toBe("AP Biology");
    }
    if ("metadata" in result.body) {
      expect(result.body.metadata).toHaveProperty("author", "test-author");
    }
  });
});