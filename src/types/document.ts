export type DocumentStatus =
  | "uploaded"
  | "needs_review"
  | "validated"
  | "rejected";

export type DocumentType = "invoice" | "purchase_order" | "unknown";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssueType =
  | "missing_field"
  | "invalid_date"
  | "line_item_mismatch"
  | "subtotal_mismatch"
  | "total_mismatch"
  | "multiple_total_values"
  | "duplicate_document_number";

export type ValidationIssue = {
  type: ValidationIssueType;
  field?: string;
  message: string;
  severity: ValidationSeverity;
};

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ExtractedDocument = {
  documentType: DocumentType;
  supplierName?: string;
  documentNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  lineItems: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  totalCandidates?: number[];
};

export type StoredDocument = ExtractedDocument & {
  id: string;
  originalFileName: string;
  fileType: string;
  originalFileSize?: number;
  hasOriginalFile?: boolean;
  rawText: string;
  status: DocumentStatus;
  validationIssues: ValidationIssue[];
  createdAt: string;
  updatedAt: string;
};