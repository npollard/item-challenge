import { describe, expect, it } from "vitest";
import { createItemHandler } from "../handlers/createItemHandler.js";

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

    const result = await createItemHandler(itemData);

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