import { NextResponse } from "next/server";
import {
  deleteDocument,
  getDocumentById,
  updateDocument,
} from "@/lib/documents/documentRepository";
import { ExtractedDocument } from "@/types/document";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const document = await getDocumentById(id);

  if (!document) {
    return NextResponse.json(
      { message: "Document not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    document,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as ExtractedDocument;

  const updatedDocument = await updateDocument(id, body);

  if (!updatedDocument) {
    return NextResponse.json(
      { message: "Document not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    document: updatedDocument,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const deleted = await deleteDocument(id);

  if (!deleted) {
    return NextResponse.json(
      { message: "Document not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    id,
  });
}