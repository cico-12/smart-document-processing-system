import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/documents/documentRepository";
import { getOriginalFile } from "@/lib/documents/originalFileRepository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function safeFileName(fileName: string) {
  return fileName.replace(/["\\]/g, "");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const document = await getDocumentById(id);

  if (!document) {
    return NextResponse.json(
      { message: "Document not found." },
      { status: 404 }
    );
  }

  const originalFile = await getOriginalFile(id);

  if (!originalFile) {
    return NextResponse.json(
      {
        message:
          "Original file was not stored for this document. Re-upload the file to enable preview.",
      },
      { status: 404 }
    );
  }

  return new Response(new Uint8Array(originalFile.buffer), {
    headers: {
      "Content-Type": originalFile.fileType || "application/octet-stream",
      "Content-Length": String(originalFile.size),
      "Content-Disposition": `inline; filename="${safeFileName(
        originalFile.fileName
      )}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}