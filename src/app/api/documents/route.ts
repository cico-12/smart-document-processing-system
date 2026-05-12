import { NextResponse } from "next/server";
import { getDocuments } from "@/lib/documents/documentRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const documents = await getDocuments();

  return NextResponse.json({
    documents,
  });
}