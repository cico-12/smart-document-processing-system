import { describe, expect, it } from "vitest";
import { validateDocument } from "@/lib/processing/validateDocument";
import { ExtractedDocument } from "@/types/document";

function createValidDocument(
  overrides: Partial<ExtractedDocument> = {}
): ExtractedDocument {
  return {
    documentType: "invoice",
    supplierName: "Company A",
    documentNumber: "INV-1001",
    issueDate: "2026-04-28",
    dueDate: "2026-05-28",
    currency: "EUR",
    lineItems: [
      {
        description: "Service A",
        quantity: 2,
        unitPrice: 100,
        amount: 200,
      },
      {
        description: "Service B",
        quantity: 1,
        unitPrice: 50,
        amount: 50,
      },
    ],
    subtotal: 250,
    tax: 50,
    total: 300,
    ...overrides,
  };
}

describe("validateDocument", () => {
  it("returns no issues for a valid document", () => {
    const document = createValidDocument();

    const issues = validateDocument(document, false);

    expect(issues).toEqual([]);
  });

  it("detects missing required fields", () => {
    const document = createValidDocument({
      documentType: "unknown",
      supplierName: undefined,
      documentNumber: undefined,
      issueDate: undefined,
      currency: undefined,
      lineItems: [],
      subtotal: undefined,
      tax: undefined,
      total: undefined,
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing_field",
          field: "documentType",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "supplierName",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "documentNumber",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "issueDate",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "currency",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "lineItems",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "subtotal",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "tax",
        }),
        expect.objectContaining({
          type: "missing_field",
          field: "total",
        }),
      ])
    );
  });

  it("detects invalid issue date", () => {
    const document = createValidDocument({
      issueDate: "not-a-date",
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "invalid_date",
          field: "issueDate",
        }),
      ])
    );
  });

  it("detects due date before issue date", () => {
    const document = createValidDocument({
      issueDate: "2026-05-28",
      dueDate: "2026-04-28",
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "invalid_date",
          field: "dueDate",
        }),
      ])
    );
  });

  it("detects incorrect line item amount", () => {
    const document = createValidDocument({
      lineItems: [
        {
          description: "Service A",
          quantity: 2,
          unitPrice: 100,
          amount: 150,
        },
      ],
      subtotal: 150,
      tax: 30,
      total: 180,
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "line_item_mismatch",
          field: "lineItems.0.amount",
        }),
      ])
    );
  });

  it("detects subtotal mismatch", () => {
    const document = createValidDocument({
      subtotal: 200,
      tax: 50,
      total: 250,
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "subtotal_mismatch",
          field: "subtotal",
        }),
      ])
    );
  });

  it("detects total mismatch", () => {
    const document = createValidDocument({
      subtotal: 250,
      tax: 50,
      total: 260,
    });

    const issues = validateDocument(document, false);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "total_mismatch",
          field: "total",
        }),
      ])
    );
  });

  it("detects duplicate document number", () => {
    const document = createValidDocument();

    const issues = validateDocument(document, true);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "duplicate_document_number",
          field: "documentNumber",
        }),
      ])
    );
  });
});