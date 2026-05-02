import { describe, expect, it } from "vitest";
import { createItemHandler } from "../handlers/createItemHandler.js";
import { getItemHandler } from "../handlers/getItemHandler.js";

describe("getItemHandler", () => {
  it("should return 404 for non-existent item", async () => {
    const result = await getItemHandler("non-existent-id");

    expect(result.statusCode).toBe(404);
    expect(result.body).toHaveProperty("error");
    if ("error" in result.body) {
      expect(result.body.error).toBe("Item not found");
    }
  });

  it("should retrieve an existing item", async () => {
    // First create an item
    const itemData = {
      subject: "AP Calculus",
      itemType: "free-response",
      difficulty: 4,
      content: {
        question: "Calculate the derivative...",
        correctAnswer: "42",
        explanation: "Using the chain rule...",
      },
      metadata: {
        author: "test-author",
        status: "approved",
        tags: ["calculus", "derivatives"],
      },
      securityLevel: "standard",
    };

    const createResult = await createItemHandler(itemData);
    expect(createResult.body).toHaveProperty("id");
    if (!("id" in createResult.body)) {
      throw new Error("Item creation failed");
    }
    const itemId = createResult.body.id;

    // Then retrieve it
    const getResult = await getItemHandler(itemId);

    expect(getResult.statusCode).toBe(200);
    expect(getResult.body).toHaveProperty("id", itemId);
    if ("subject" in getResult.body) {
      expect(getResult.body.subject).toBe("AP Calculus");
    }
  });
});