import { DocumentStatus, ValidationIssue } from "@/types/document";

export function getStatusFromIssues(
  issues: ValidationIssue[]
): DocumentStatus {
  const hasError = issues.some((issue) => issue.severity === "error");

  return hasError ? "needs_review" : "validated";
}