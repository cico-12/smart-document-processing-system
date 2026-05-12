import { NextResponse } from "next/server";
import { deleteDocument } from "@/lib/documents/documentRepository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
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