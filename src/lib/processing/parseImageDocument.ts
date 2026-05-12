import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import { normalizeText } from "@/lib/utils/strings";

type OcrWord = {
  text?: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence?: number;
};

function cleanOcrToken(value?: string) {
  return String(value ?? "")
    .replace(/[|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function prepareImageForOcr(buffer: Buffer) {
  return sharp(buffer)
    .resize({
      width: 2400,
      withoutEnlargement: false,
    })
    .grayscale()
    .normalize()
    .sharpen({
      sigma: 1,
    })
    .png()
    .toBuffer();
}

function buildLayoutText(words: OcrWord[]) {
  const validWords = words
    .map((word) => ({
      ...word,
      text: cleanOcrToken(word.text),
    }))
    .filter((word) => {
      if (!word.text || !word.bbox) return false;
      if (typeof word.confidence === "number" && word.confidence < 20) {
        return false;
      }

      return true;
    });

  if (!validWords.length) {
    return "";
  }

  const sortedWords = [...validWords].sort((a, b) => {
    const ay = a.bbox?.y0 ?? 0;
    const by = b.bbox?.y0 ?? 0;

    if (Math.abs(ay - by) > 8) {
      return ay - by;
    }

    return (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0);
  });

  const rows: OcrWord[][] = [];

  for (const word of sortedWords) {
    const wordBox = word.bbox;
    if (!wordBox) continue;

    const wordMidY = (wordBox.y0 + wordBox.y1) / 2;

    let bestRow: OcrWord[] | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const row of rows) {
      const rowWords = row.filter((rowWord) => rowWord.bbox);
      if (!rowWords.length) continue;

      const rowMidY =
        rowWords.reduce((sum, rowWord) => {
          const box = rowWord.bbox!;
          return sum + (box.y0 + box.y1) / 2;
        }, 0) / rowWords.length;

      const averageHeight =
        rowWords.reduce((sum, rowWord) => {
          const box = rowWord.bbox!;
          return sum + Math.max(1, box.y1 - box.y0);
        }, 0) / rowWords.length;

      const distance = Math.abs(wordMidY - rowMidY);
      const threshold = Math.max(8, averageHeight * 0.65);

      if (distance <= threshold && distance < bestDistance) {
        bestRow = row;
        bestDistance = distance;
      }
    }

    if (bestRow) {
      bestRow.push(word);
    } else {
      rows.push([word]);
    }
  }

  return rows
    .map((row) => {
      const sortedRow = [...row].sort(
        (a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0)
      );

      const parts: string[] = [];

      for (const [index, word] of sortedRow.entries()) {
        const text = cleanOcrToken(word.text);
        if (!text) continue;

        if (index === 0) {
          parts.push(text);
          continue;
        }

        const previous = sortedRow[index - 1];
        const previousBox = previous.bbox;
        const currentBox = word.bbox;

        if (!previousBox || !currentBox) {
          parts.push(text);
          continue;
        }

        const gap = currentBox.x0 - previousBox.x1;
        const previousWidth = Math.max(1, previousBox.x1 - previousBox.x0);

        if (gap > previousWidth * 1.3) {
          parts.push("   ");
        } else {
          parts.push(" ");
        }

        parts.push(text);
      }

      return parts.join("").replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n");
}

export async function extractImageText(buffer: Buffer) {
  const processedBuffer = await prepareImageForOcr(buffer);

  const worker = await createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    const result = await worker.recognize(processedBuffer);
    const data = result.data as typeof result.data & { words?: OcrWord[] };

    const layoutText = buildLayoutText(data.words ?? []);
    const plainText = data.text ?? "";

    return normalizeText(
      [layoutText, plainText].filter((value) => value.trim()).join("\n\n")
    );
  } finally {
    await worker.terminate();
  }
}