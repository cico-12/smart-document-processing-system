import { NextResponse } from "next/server";
import {
  createProcessedDocument,
  documentNumberExists,
  markDocumentOriginalFileSaved,
} from "@/lib/documents/documentRepository";
import { saveOriginalFile } from "@/lib/documents/originalFileRepository";
import { extractTextFromFile } from "@/lib/processing/extractText";
import { parseDocument } from "@/lib/processing/parseDocument";
import { validateDocument } from "@/lib/processing/validateDocument";

export const runtime = "nodejs";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "No file was uploaded." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          message:
            "File is too large for this demo. Please upload a file smaller than 5MB.",
        },
        { status: 400 }
      );
    }

    const fileType = file.type || "application/octet-stream";

    const rawText = await extractTextFromFile({
      buffer,
      fileName: file.name,
      fileType,
    });

    const extracted = parseDocument({
      rawText,
      fileName: file.name,
      fileType,
    });

    const duplicate = await documentNumberExists(extracted.documentNumber);
    const validationIssues = validateDocument(extracted, duplicate);

    let document = await createProcessedDocument({
      originalFileName: file.name,
      fileType,
      originalFileSize: buffer.length,
      hasOriginalFile: false,
      rawText,
      extracted,
      validationIssues,
    });

    await saveOriginalFile({
      documentId: document.id,
      fileName: file.name,
      fileType,
      buffer,
    });

    document = await markDocumentOriginalFileSaved(document.id, buffer.length) ?? document;

    return NextResponse.json(
      {
        document,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload failed:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to process uploaded document.",
      },
      { status: 500 }
    );
  }
}