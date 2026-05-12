import { NextResponse } from "next/server";
import { confirmDocument } from "@/lib/documents/documentRepository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const document = await confirmDocument(id);

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