import { ExtractedDocument } from "@/types/document";
import { parseTextLikeDocument } from "@/lib/processing/parseDocument";

export function parseTxtDocument(
  rawText: string,
  fileName: string
): ExtractedDocument {
  return parseTextLikeDocument(rawText, fileName);
}