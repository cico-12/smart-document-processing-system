import { adminDb } from "@/lib/firebase/admin";
import { getStatusFromIssues } from "@/lib/documents/documentStatus";
import { deleteOriginalFile } from "@/lib/documents/originalFileRepository";
import { validateDocument } from "@/lib/processing/validateDocument";
import { sanitizeForFirestore } from "@/lib/utils/firestore";
import {
  ExtractedDocument,
  StoredDocument,
  ValidationIssue,
} from "@/types/document";

const COLLECTION_NAME = "documents";

type CreateDocumentInput = {
  originalFileName: string;
  fileType: string;
  originalFileSize?: number;
  hasOriginalFile?: boolean;
  rawText: string;
  extracted: ExtractedDocument;
  validationIssues: ValidationIssue[];
};

type UpdateDocumentInput = ExtractedDocument;

function documentRef(id: string) {
  return adminDb.collection(COLLECTION_NAME).doc(id);
}

function mapFirestoreDocument(
  id: string,
  data: FirebaseFirestore.DocumentData
): StoredDocument {
  return {
    id,
    originalFileName: data.originalFileName ?? "",
    fileType: data.fileType ?? "",
    originalFileSize: data.originalFileSize ?? undefined,
    hasOriginalFile: data.hasOriginalFile ?? false,
    rawText: data.rawText ?? "",

    status: data.status ?? "uploaded",

    documentType: data.documentType ?? "unknown",
    supplierName: data.supplierName ?? undefined,
    documentNumber: data.documentNumber ?? undefined,
    issueDate: data.issueDate ?? undefined,
    dueDate: data.dueDate ?? undefined,
    currency: data.currency ?? undefined,
    lineItems: data.lineItems ?? [],

    subtotal: data.subtotal ?? undefined,
    tax: data.tax ?? undefined,
    total: data.total ?? undefined,

    validationIssues: data.validationIssues ?? [],

    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

export async function createProcessedDocument(input: CreateDocumentInput) {
  const now = new Date().toISOString();
  const ref = adminDb.collection(COLLECTION_NAME).doc();

  const status = getStatusFromIssues(input.validationIssues);

  const documentData = {
    originalFileName: input.originalFileName,
    fileType: input.fileType,
    originalFileSize: input.originalFileSize,
    hasOriginalFile: input.hasOriginalFile ?? false,
    rawText: input.rawText,

    status,

    ...input.extracted,

    validationIssues: input.validationIssues,

    createdAt: now,
    updatedAt: now,
  };

  const sanitizedDocumentData = sanitizeForFirestore(documentData);

  await ref.set(sanitizedDocumentData);

  return {
    id: ref.id,
    ...sanitizedDocumentData,
  } as StoredDocument;
}

export async function markDocumentOriginalFileSaved(
  id: string,
  originalFileSize: number
) {
  await documentRef(id).update({
    hasOriginalFile: true,
    originalFileSize,
    updatedAt: new Date().toISOString(),
  });

  return getDocumentById(id);
}

export async function getDocuments() {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => mapFirestoreDocument(doc.id, doc.data()));
}

export async function getDocumentById(id: string) {
  const snapshot = await documentRef(id).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapFirestoreDocument(snapshot.id, snapshot.data() ?? {});
}

export async function documentNumberExists(
  documentNumber?: string,
  excludeId?: string
) {
  if (!documentNumber) {
    return false;
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where("documentNumber", "==", documentNumber)
    .limit(5)
    .get();

  return snapshot.docs.some((doc) => doc.id !== excludeId);
}

export async function updateDocument(id: string, input: UpdateDocumentInput) {
  const existing = await getDocumentById(id);

  if (!existing) {
    return null;
  }

  const duplicate = await documentNumberExists(input.documentNumber, id);
  const validationIssues = validateDocument(input, duplicate);
  const status = getStatusFromIssues(validationIssues);

  const updatedData = {
    ...input,
    validationIssues,
    status,
    updatedAt: new Date().toISOString(),
  };

  await documentRef(id).update(sanitizeForFirestore(updatedData));

  return getDocumentById(id);
}

export async function confirmDocument(id: string) {
  const existing = await getDocumentById(id);

  if (!existing) {
    return null;
  }

  await documentRef(id).update({
    status: "validated",
    updatedAt: new Date().toISOString(),
  });

  return getDocumentById(id);
}

export async function rejectDocument(id: string) {
  const existing = await getDocumentById(id);

  if (!existing) {
    return null;
  }

  await documentRef(id).update({
    status: "rejected",
    updatedAt: new Date().toISOString(),
  });

  return getDocumentById(id);
}

export async function deleteDocument(id: string) {
  const existing = await getDocumentById(id);

  if (!existing) {
    return false;
  }

  await deleteOriginalFile(id);
  await documentRef(id).delete();

  return true;
}