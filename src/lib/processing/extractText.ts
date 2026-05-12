import { extractImageText } from "@/lib/processing/parseImageDocument";
import { extractPdfText } from "@/lib/processing/parsePdfDocument";
import { normalizeText } from "@/lib/utils/strings";

type ExtractTextInput = {
  buffer: Buffer;
  fileName: string;
  fileType: string;
};

function getLowerFileName(fileName: string) {
  return fileName.toLowerCase();
}

export async function extractTextFromFile({
  buffer,
  fileName,
  fileType,
}: ExtractTextInput) {
  const lowerFileName = getLowerFileName(fileName);
  const lowerFileType = fileType.toLowerCase();

  if (lowerFileType.includes("pdf") || lowerFileName.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (
    lowerFileType.includes("image") ||
    lowerFileName.endsWith(".png") ||
    lowerFileName.endsWith(".jpg") ||
    lowerFileName.endsWith(".jpeg")
  ) {
    return extractImageText(buffer);
  }

  if (
    lowerFileType.includes("csv") ||
    lowerFileName.endsWith(".csv") ||
    lowerFileType.includes("text") ||
    lowerFileName.endsWith(".txt")
  ) {
    return normalizeText(buffer.toString("utf-8"));
  }

  throw new Error(
    "Unsupported file type. Please upload PDF, image, CSV, or TXT files."
  );
}