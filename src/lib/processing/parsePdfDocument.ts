import { extractText, getDocumentProxy } from "unpdf";
import { normalizeText } from "@/lib/utils/strings";

export async function extractPdfText(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });

  return normalizeText(result.text);
}