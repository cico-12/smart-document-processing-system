import { ExtractedDocument, ValidationIssue } from "@/types/document";
import { isDueDateBeforeIssueDate, isValidDateString } from "@/lib/utils/dates";
import { isCloseMoney, roundMoney } from "@/lib/utils/money";
import { isEmpty } from "@/lib/utils/strings";

export function validateDocument(
  document: ExtractedDocument,
  duplicateDocumentNumber: boolean
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (document.documentType === "unknown") {
    issues.push({
      type: "missing_field",
      field: "documentType",
      severity: "error",
      message: "Document type could not be detected.",
    });
  }

  if (isEmpty(document.supplierName)) {
    issues.push({
      type: "missing_field",
      field: "supplierName",
      severity: "error",
      message: "Supplier/company name is missing.",
    });
  }

  if (isEmpty(document.documentNumber)) {
    issues.push({
      type: "missing_field",
      field: "documentNumber",
      severity: "error",
      message: "Document number is missing.",
    });
  }

  if (isEmpty(document.issueDate)) {
    issues.push({
      type: "missing_field",
      field: "issueDate",
      severity: "error",
      message: "Issue date is missing.",
    });
  } else if (!isValidDateString(document.issueDate)) {
    issues.push({
      type: "invalid_date",
      field: "issueDate",
      severity: "error",
      message: "Issue date is invalid.",
    });
  }

  if (document.dueDate && !isValidDateString(document.dueDate)) {
    issues.push({
      type: "invalid_date",
      field: "dueDate",
      severity: "error",
      message: "Due date is invalid.",
    });
  }

  if (isDueDateBeforeIssueDate(document.issueDate, document.dueDate)) {
    issues.push({
      type: "invalid_date",
      field: "dueDate",
      severity: "error",
      message: "Due date cannot be before issue date.",
    });
  }

  if (isEmpty(document.currency)) {
    issues.push({
      type: "missing_field",
      field: "currency",
      severity: "error",
      message: "Currency is missing.",
    });
  }

  if (!document.lineItems.length) {
    issues.push({
      type: "missing_field",
      field: "lineItems",
      severity: "warning",
      message: "No line items were detected.",
    });
  }

  for (const [index, item] of document.lineItems.entries()) {
    const expectedAmount = roundMoney(item.quantity * item.unitPrice);

    if (!isCloseMoney(expectedAmount, item.amount)) {
      issues.push({
        type: "line_item_mismatch",
        field: `lineItems.${index}.amount`,
        severity: "error",
        message: `Line item ${index + 1} amount is incorrect. Expected ${expectedAmount.toFixed(
          2
        )}, got ${item.amount.toFixed(2)}.`,
      });
    }
  }

  if (typeof document.subtotal !== "number") {
    issues.push({
      type: "missing_field",
      field: "subtotal",
      severity: "error",
      message: "Subtotal is missing.",
    });
  }

  if (
    typeof document.tax !== "number" &&
    typeof document.subtotal === "number" &&
    typeof document.total === "number" &&
    !isCloseMoney(document.subtotal, document.total)
  ) {
    issues.push({
      type: "missing_field",
      field: "tax",
      severity: "error",
      message: "Tax is missing.",
    });
  }

  if (typeof document.total !== "number") {
    issues.push({
      type: "missing_field",
      field: "total",
      severity: "error",
      message: "Total is missing.",
    });
  }

  if (document.lineItems.length > 0 && typeof document.subtotal === "number") {
    const calculatedSubtotal = roundMoney(
      document.lineItems.reduce((sum, item) => sum + item.amount, 0)
    );

    if (!isCloseMoney(calculatedSubtotal, document.subtotal)) {
      issues.push({
        type: "subtotal_mismatch",
        field: "subtotal",
        severity: "error",
        message: `Subtotal mismatch. Expected ${calculatedSubtotal.toFixed(
          2
        )}, got ${document.subtotal.toFixed(2)}.`,
      });
    }
  }

  if (
    typeof document.subtotal === "number" &&
    typeof document.tax === "number" &&
    typeof document.total === "number"
  ) {
    const expectedTotal = roundMoney(document.subtotal + document.tax);

    if (!isCloseMoney(expectedTotal, document.total)) {
      issues.push({
        type: "total_mismatch",
        field: "total",
        severity: "error",
        message: `Total mismatch. Expected ${expectedTotal.toFixed(
          2
        )}, got ${document.total.toFixed(2)}.`,
      });
    }
  }

  if (document.totalCandidates && document.totalCandidates.length > 1) {
    const uniqueTotals = Array.from(new Set(document.totalCandidates));

    if (uniqueTotals.length > 1) {
      issues.push({
        type: "multiple_total_values",
        field: "total",
        severity: "warning",
        message: `Multiple total values were detected: ${uniqueTotals
          .map((value) => value.toFixed(2))
          .join(", ")}. Using ${document.total?.toFixed(
          2
        ) ?? "selected total"} for validation.`,
      });
    }
  }

  if (duplicateDocumentNumber) {
    issues.push({
      type: "duplicate_document_number",
      field: "documentNumber",
      severity: "error",
      message: "Another document with this document number already exists.",
    });
  }

  return issues;
}