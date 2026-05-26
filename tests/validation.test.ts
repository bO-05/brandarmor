import { describe, it, expect } from "vitest";
import { insertBrandSchema, insertProductSchema, insertListingSchema, insertReviewDecisionSchema, insertEvaluationCaseSchema, insertEvidenceSchema } from "../src/domain/schemas";

describe("insertBrandSchema", () => {
  it("validates a correct brand", () => {
    const result = insertBrandSchema.safeParse({ name: "Test Brand" });
    expect(result.success).toBe(true);
  });
  it("rejects empty name", () => {
    const result = insertBrandSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
  it("rejects invalid websiteUrl", () => {
    const result = insertBrandSchema.safeParse({ name: "Test", websiteUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });
});

describe("insertProductSchema", () => {
  it("validates a correct product", () => {
    const result = insertProductSchema.safeParse({
      brandId: "b1",
      name: "Test Product",
      msrp: 100000,
      msrpCurrency: "IDR",
    });
    expect(result.success).toBe(true);
  });
  it("rejects missing brandId", () => {
    const result = insertProductSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });
  it("rejects negative msrp", () => {
    const result = insertProductSchema.safeParse({ brandId: "b1", name: "Test", msrp: -100 });
    expect(result.success).toBe(false);
  });
  it("defaults msrpCurrency to IDR", () => {
    const result = insertProductSchema.safeParse({ brandId: "b1", name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.msrpCurrency).toBe("IDR");
  });
});

describe("insertListingSchema", () => {
  it("validates a correct listing", () => {
    const result = insertListingSchema.safeParse({
      title: "Test Listing",
      sourceType: "manual",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid sourceType", () => {
    const result = insertListingSchema.safeParse({
      title: "Test",
      sourceType: "invalid",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
  it("accepts string description", () => {
    const result = insertListingSchema.safeParse({
      title: "Test",
      description: "A great product listing",
      sourceType: "manual",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("A great product listing");
  });
  it("rejects numeric description", () => {
    const result = insertListingSchema.safeParse({
      title: "Test",
      description: 12345,
      sourceType: "manual",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe("insertEvaluationCaseSchema", () => {
  it("validates a correct evaluation case", () => {
    const result = insertEvaluationCaseSchema.safeParse({
      title: "Test Case",
      groundTruth: "counterfeit",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
  it("accepts string description", () => {
    const result = insertEvaluationCaseSchema.safeParse({
      title: "Test",
      description: "A labeled evaluation case",
      groundTruth: "legitimate",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("A labeled evaluation case");
  });
  it("rejects numeric description", () => {
    const result = insertEvaluationCaseSchema.safeParse({
      title: "Test",
      description: 99999,
      groundTruth: "counterfeit",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
  it("rejects invalid groundTruth", () => {
    const result = insertEvaluationCaseSchema.safeParse({
      title: "Test",
      groundTruth: "bogus",
      observedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe("insertReviewDecisionSchema", () => {
  it("validates with correct status", () => {
    const result = insertReviewDecisionSchema.safeParse({
      listingId: "l1",
      scoreId: "s1",
      status: "pending",
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid status", () => {
    const result = insertReviewDecisionSchema.safeParse({
      listingId: "l1",
      scoreId: "s1",
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertEvidenceSchema", () => {
  it("validates correct evidence", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1",
      evidenceType: "text",
      fieldName: "title",
      extractedValue: "Some title",
    });
    expect(result.success).toBe(true);
  });
  it("rejects missing listingId", () => {
    const result = insertEvidenceSchema.safeParse({
      evidenceType: "text",
      fieldName: "title",
      extractedValue: "value",
    });
    expect(result.success).toBe(false);
  });
  it("rejects empty evidenceType", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1",
      evidenceType: "",
      fieldName: "title",
      extractedValue: "value",
    });
    expect(result.success).toBe(false);
  });
  it("accepts optional confidence", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1",
      evidenceType: "text",
      fieldName: "title",
      extractedValue: "value",
      confidence: 0.95,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.confidence).toBe(0.95);
  });
  it("rejects confidence outside 0-1", () => {
    const result = insertEvidenceSchema.safeParse({
      listingId: "l1",
      evidenceType: "text",
      fieldName: "title",
      extractedValue: "value",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });
});