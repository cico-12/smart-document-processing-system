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

type ValidOcrWord = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence?: number;
};

type OcrRow = {
  words: ValidOcrWord[];
  midY: number;
  minY: number;
  maxY: number;
  height: number;
  text: string;
};

type TableCropCandidate = {
  source: "image" | "ocr";
  buffer: Buffer;
};

const TABLE_END_PATTERN =
  /\b(?:subtotal|sub\s+total|tax|vat|total\s+due|grand\s+total|amount\s+due|balance\s+due|cash\s+payment|terms|thank\s+you)\b/i;

const DESCRIPTION_NOISE_PATTERN =
  /\b(?:lorem|ipsum|dolor|sit|amet|consectetur|adipiscing|elit|elitsse|cond|vestibulum|viverra|egestas|tellus|interdum|elementum|semper|ullamcorper)\b/i;

function cleanOcrToken(value?: string) {
  return String(value ?? "")
    .replace(/[|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrOutputText(value: string) {
  return value
    .split(/\n+/)
    .map((line) => normalizeText(line).trim())
    .filter(Boolean)
    .join("\n");
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

function getWordCenterY(word: ValidOcrWord) {
  return (word.bbox.y0 + word.bbox.y1) / 2;
}

function getWordHeight(word: ValidOcrWord) {
  return Math.max(1, word.bbox.y1 - word.bbox.y0);
}

function getValidWords(words: OcrWord[]) {
  return words
    .map((word): ValidOcrWord | null => {
      const text = cleanOcrToken(word.text);

      if (!text || !word.bbox) {
        return null;
      }

      if (typeof word.confidence === "number" && word.confidence < 10) {
        return null;
      }

      return {
        text,
        bbox: word.bbox,
        confidence: word.confidence,
      };
    })
    .filter((word): word is ValidOcrWord => Boolean(word));
}

function buildRow(words: ValidOcrWord[]): OcrRow {
  const sortedWords = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const minY = Math.min(...sortedWords.map((word) => word.bbox.y0));
  const maxY = Math.max(...sortedWords.map((word) => word.bbox.y1));

  return {
    words: sortedWords,
    minY,
    maxY,
    midY: (minY + maxY) / 2,
    height: Math.max(1, maxY - minY),
    text: sortedWords.map((word) => word.text).join(" "),
  };
}

function groupWordsIntoRows(words: ValidOcrWord[]) {
  const sortedWords = [...words].sort((a, b) => {
    const yDiff = a.bbox.y0 - b.bbox.y0;

    if (Math.abs(yDiff) > 8) {
      return yDiff;
    }

    return a.bbox.x0 - b.bbox.x0;
  });

  const groupedRows: ValidOcrWord[][] = [];

  for (const word of sortedWords) {
    const wordMidY = getWordCenterY(word);

    let bestRow: ValidOcrWord[] | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const row of groupedRows) {
      const rowStats = buildRow(row);

      const averageHeight =
        row.reduce((sum, rowWord) => sum + getWordHeight(rowWord), 0) /
        row.length;

      const distance = Math.abs(wordMidY - rowStats.midY);
      const threshold = Math.max(8, averageHeight * 0.75);

      if (distance <= threshold && distance < bestDistance) {
        bestRow = row;
        bestDistance = distance;
      }
    }

    if (bestRow) {
      bestRow.push(word);
    } else {
      groupedRows.push([word]);
    }
  }

  return groupedRows
    .map(buildRow)
    .sort((a, b) => {
      if (Math.abs(a.midY - b.midY) > 8) {
        return a.midY - b.midY;
      }

      return (a.words[0]?.bbox.x0 ?? 0) - (b.words[0]?.bbox.x0 ?? 0);
    });
}

function isLikelyTableHeaderLine(line: string) {
  const lower = line.toLowerCase();

  const hasDescriptionColumn =
    /\b(category|categ\w*|description|product\s+name|item)\b/i.test(lower);

  const hasNumericColumn =
    /\b(rate|price|unit\s+price|quantity|qty|amount|total)\b/i.test(lower);

  return hasDescriptionColumn && hasNumericColumn;
}

function findHeaderRow(rows: OcrRow[]) {
  return rows.find((row) => isLikelyTableHeaderLine(row.text));
}

function findTableEndRow(rows: OcrRow[], headerRow: OcrRow) {
  return rows.find((row) => {
    return row.midY > headerRow.midY && TABLE_END_PATTERN.test(row.text);
  });
}

async function buildOcrBasedTableCropBuffer(
  processedBuffer: Buffer,
  words: OcrWord[]
) {
  const validWords = getValidWords(words);

  if (!validWords.length) {
    return undefined;
  }

  const rows = groupWordsIntoRows(validWords);
  const headerRow = findHeaderRow(rows);

  if (!headerRow) {
    return undefined;
  }

  const metadata = await sharp(processedBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    return undefined;
  }

  const endRow = findTableEndRow(rows, headerRow);

  const top = Math.max(0, Math.floor(headerRow.minY - 60));
  const bottom = Math.min(
    metadata.height,
    Math.ceil((endRow?.minY ?? headerRow.maxY + metadata.height * 0.4) - 10)
  );

  const wordsInsideTableY = validWords.filter((word) => {
    const y = getWordCenterY(word);
    return y >= top && y <= bottom;
  });

  const left = Math.max(
    0,
    Math.floor(Math.min(...headerRow.words.map((word) => word.bbox.x0)) - 70)
  );

  const right = Math.min(
    metadata.width,
    Math.ceil(
      Math.max(
        ...headerRow.words.map((word) => word.bbox.x1),
        ...wordsInsideTableY.map((word) => word.bbox.x1)
      ) + 100
    )
  );

  const width = right - left;
  const height = bottom - top;

  if (width <= 100 || height <= 100) {
    return undefined;
  }

  return sharp(processedBuffer)
    .extract({
      left,
      top,
      width,
      height,
    })
    .resize({
      width: Math.min(width * 2, 4200),
      withoutEnlargement: false,
    })
    .normalize()
    .sharpen({
      sigma: 1,
    })
    .png()
    .toBuffer();
}

function closeSmallFalseGaps(mask: boolean[], maxGap: number) {
  const nextMask = [...mask];

  let index = 0;

  while (index < nextMask.length) {
    if (nextMask[index]) {
      index += 1;
      continue;
    }

    const start = index;

    while (index < nextMask.length && !nextMask[index]) {
      index += 1;
    }

    const end = index;
    const gapLength = end - start;
    const hasTrueBefore = start > 0 && nextMask[start - 1];
    const hasTrueAfter = end < nextMask.length && nextMask[end];

    if (hasTrueBefore && hasTrueAfter && gapLength <= maxGap) {
      for (let fillIndex = start; fillIndex < end; fillIndex += 1) {
        nextMask[fillIndex] = true;
      }
    }
  }

  return nextMask;
}

function findTrueSegments(mask: boolean[]) {
  const segments: Array<{ start: number; end: number; length: number }> = [];

  let start: number | undefined;

  for (let index = 0; index <= mask.length; index += 1) {
    const value = mask[index] ?? false;

    if (value && typeof start !== "number") {
      start = index;
    }

    if (!value && typeof start === "number") {
      segments.push({
        start,
        end: index,
        length: index - start,
      });

      start = undefined;
    }
  }

  return segments;
}

async function buildImageBasedTableCropBuffer(processedBuffer: Buffer) {
  const rawImage = await sharp(processedBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = rawImage;
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (!width || !height || !channels) {
    return undefined;
  }

  const getPixel = (x: number, y: number) => {
    return data[(y * width + x) * channels] ?? 0;
  };

  const thresholds = [210, 200, 190, 180];

  let bestCrop:
    | {
        left: number;
        top: number;
        width: number;
        height: number;
        score: number;
      }
    | undefined;

  for (const threshold of thresholds) {
    const rowBrightCounts: number[] = [];

    for (let y = 0; y < height; y += 1) {
      let brightCount = 0;

      for (let x = 0; x < width; x += 1) {
        if (getPixel(x, y) >= threshold) {
          brightCount += 1;
        }
      }

      rowBrightCounts.push(brightCount);
    }

    const rowMask = closeSmallFalseGaps(
      rowBrightCounts.map((count) => count >= width * 0.25),
      6
    );

    const rowSegments = findTrueSegments(rowMask).filter((segment) => {
      return segment.length >= Math.max(90, height * 0.06);
    });

    for (const rowSegment of rowSegments) {
      const segmentHeight = rowSegment.length;
      const columnBrightCounts: number[] = [];

      for (let x = 0; x < width; x += 1) {
        let brightCount = 0;

        for (let y = rowSegment.start; y < rowSegment.end; y += 1) {
          if (getPixel(x, y) >= threshold) {
            brightCount += 1;
          }
        }

        columnBrightCounts.push(brightCount);
      }

      const columnMask = closeSmallFalseGaps(
        columnBrightCounts.map((count) => count >= segmentHeight * 0.35),
        8
      );

      const columnSegments = findTrueSegments(columnMask).filter((segment) => {
        return segment.length >= width * 0.25;
      });

      const widestColumnSegment = columnSegments.sort(
        (a, b) => b.length - a.length
      )[0];

      if (!widestColumnSegment) {
        continue;
      }

      const brightAreaScore =
        segmentHeight *
        widestColumnSegment.length *
        (threshold === 200 ? 1.15 : 1);

      const headerMargin = Math.max(70, Math.round(segmentHeight * 0.12));
      const bottomMargin = Math.max(20, Math.round(segmentHeight * 0.03));
      const sideMargin = Math.max(35, Math.round(widestColumnSegment.length * 0.03));

      const left = Math.max(0, widestColumnSegment.start - sideMargin);
      const top = Math.max(0, rowSegment.start - headerMargin);
      const right = Math.min(width, widestColumnSegment.end + sideMargin);
      const bottom = Math.min(height, rowSegment.end + bottomMargin);

      const cropWidth = right - left;
      const cropHeight = bottom - top;

      if (cropWidth <= 100 || cropHeight <= 100) {
        continue;
      }

      if (!bestCrop || brightAreaScore > bestCrop.score) {
        bestCrop = {
          left,
          top,
          width: cropWidth,
          height: cropHeight,
          score: brightAreaScore,
        };
      }
    }
  }

  if (!bestCrop) {
    return undefined;
  }

  return sharp(processedBuffer)
    .extract({
      left: bestCrop.left,
      top: bestCrop.top,
      width: bestCrop.width,
      height: bestCrop.height,
    })
    .resize({
      width: Math.min(bestCrop.width * 2, 4200),
      withoutEnlargement: false,
    })
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      background: "#ffffff",
    })
    .normalize()
    .sharpen({
      sigma: 1,
    })
    .png()
    .toBuffer();
}

function normalizeTitleSpacing(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b([A-Z])\s+([a-z]{2,})\b/g, "$1$2")
    .replace(/\b([A-Z][a-z]{2,})\s+([A-Z])\s+([a-z]{2,})\b/g, "$1 $2$3")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitleLine(value: string) {
  return normalizeTitleSpacing(value)
    .split(DESCRIPTION_NOISE_PATTERN)[0]
    .replace(
      /\b(category|description|product|item|qty|quantity|rate|unit|price|amount|total|subtotal)\b/gi,
      " "
    )
    .replace(/[$€£₹]?\d[\d.,]*/g, " ")
    .replace(/[^A-Za-z&'’\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseTitleWord(value: string) {
  return /^(lorem|ipsum|dolor|sit|amet|consectetur|consect|nsect|sectetur|adipiscing|adipis|dipiscing|elit|elitsse|cond|vestibulum|viverra|egestas|tellus|interdum|iment|radi|larem|mmenttum|imenttum)$/i.test(
    value
  );
}

function isLikelyItemTitleLine(line: string) {
  const cleaned = cleanTitleLine(line);

  if (!cleaned) return false;
  if (TABLE_END_PATTERN.test(cleaned)) return false;
  if (isLikelyTableHeaderLine(cleaned)) return false;
  if (DESCRIPTION_NOISE_PATTERN.test(cleaned)) return false;
  if (/[$€£₹]?\d/.test(cleaned)) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (!words.length || words.length > 5) return false;
  if (words.some(isNoiseTitleWord)) return false;

  const letterCount = cleaned.replace(/[^A-Za-z]/g, "").length;

  if (letterCount < 4) return false;

  return words.some((word) => /^[A-Z][A-Za-z&'’\-]{2,}$/.test(word));
}

function parseMoneyValue(value: string) {
  const normalized = value
    .replace(/[oO]/g, "0")
    .replace(/[iIl|]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/,/g, ".");

  const match = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractLineNumbers(value: string) {
  const numbers: number[] = [];

  const numberPattern =
    /(?:[$€£₹]\s*)?-?\d+(?:[.,]\d{1,2})?(?:\s*(?:USD|EUR|BAM|GBP|AED|INR|KM))?/gi;

  for (const match of value.matchAll(numberPattern)) {
    const parsed = parseMoneyValue(match[0]);

    if (typeof parsed === "number") {
      numbers.push(parsed);
    }
  }

  return numbers;
}

function isLikelyQuantity(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 1000;
}

function isCloseAmount(left: number, right: number) {
  return Math.abs(left - right) <= 0.05;
}

function findMatchingNumericTriple(numbers: number[]) {
  for (let startIndex = 0; startIndex <= numbers.length - 3; startIndex += 1) {
    const triple = numbers.slice(startIndex, startIndex + 3);

    const possibleMappings = [
      {
        rate: triple[0],
        quantity: triple[1],
        price: triple[2],
      },
      {
        rate: triple[0],
        quantity: triple[2],
        price: triple[1],
      },
    ];

    for (const mapping of possibleMappings) {
      if (!isLikelyQuantity(mapping.quantity)) continue;
      if (mapping.rate <= 0 || mapping.price <= 0) continue;

      if (isCloseAmount(mapping.rate * mapping.quantity, mapping.price)) {
        return mapping;
      }
    }
  }

  return undefined;
}

function parseNumericLine(line: string) {
  const moneyMatches = [...line.matchAll(/[$€£₹]\s*\d+(?:[.,]\d{2})?/g)];

  if (moneyMatches.length >= 2) {
    const firstMoney = moneyMatches[0];
    const lastMoney = moneyMatches[moneyMatches.length - 1];

    const rate = parseMoneyValue(firstMoney[0]);
    const price = parseMoneyValue(lastMoney[0]);

    const firstMoneyEnd = (firstMoney.index ?? 0) + firstMoney[0].length;
    const lastMoneyStart = lastMoney.index ?? line.length;

    const betweenMoneyText = line.slice(firstMoneyEnd, lastMoneyStart);
    const quantityMatch = betweenMoneyText.match(/\b0?\d{1,3}\b/);
    const quantity = quantityMatch ? Number(quantityMatch[0]) : undefined;

    if (
      typeof rate === "number" &&
      typeof price === "number" &&
      typeof quantity === "number" &&
      isLikelyQuantity(quantity) &&
      isCloseAmount(rate * quantity, price)
    ) {
      return {
        rate,
        quantity,
        price,
      };
    }
  }

  const numbers = extractLineNumbers(line);
  return findMatchingNumericTriple(numbers);
}

function formatMoneyValue(value: number) {
  return value.toFixed(2);
}

function getLeadingTitleFromNumericLine(line: string) {
  const firstNumberIndex = line.search(/[$€£₹]?\d/);

  if (firstNumberIndex <= 0) {
    return undefined;
  }

  const leadingText = cleanTitleLine(line.slice(0, firstNumberIndex));

  if (!isLikelyItemTitleLine(leadingText)) {
    return undefined;
  }

  return leadingText;
}

function scoreStructuredTableText(value: string) {
  const lines = normalizeOcrOutputText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let score = 0;

  for (const line of lines) {
    if (isLikelyTableHeaderLine(line)) {
      score += 40;
      continue;
    }

    if (TABLE_END_PATTERN.test(line)) {
      score += 10;
      continue;
    }

    const numericValues = parseNumericLine(line);
    const firstNumberIndex = line.search(/[$€£₹]?\d/);

    if (numericValues && firstNumberIndex > 0) {
      const description = cleanTitleLine(line.slice(0, firstNumberIndex));
      const words = description.split(/\s+/).filter(Boolean);

      score += 100;
      score += Math.min(description.length, 30);

      if (words.length >= 2) score += 25;
      if (words.some(isNoiseTitleWord)) score -= 80;
      if (DESCRIPTION_NOISE_PATTERN.test(description)) score -= 80;
    }
  }

  return score;
}

function buildStructuredTableTextFromCropText(tableText: string) {
  const lines = normalizeOcrOutputText(tableText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const headerIndex = lines.findIndex((line) => isLikelyTableHeaderLine(line));

  if (headerIndex < 0) {
    return "";
  }

  const outputLines = ["Category Rate Quantity Price"];
  let pendingTitle: string | undefined;

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (TABLE_END_PATTERN.test(line)) {
      break;
    }

    if (isLikelyTableHeaderLine(line)) {
      continue;
    }

    const numericValues = parseNumericLine(line);

    if (numericValues) {
      const inlineTitle = getLeadingTitleFromNumericLine(line);
      const description = inlineTitle ?? pendingTitle;

      if (description) {
        outputLines.push(
          [
            description,
            formatMoneyValue(numericValues.rate),
            String(numericValues.quantity).padStart(2, "0"),
            formatMoneyValue(numericValues.price),
          ].join(" ")
        );

        pendingTitle = undefined;
        continue;
      }
    }

    if (isLikelyItemTitleLine(line)) {
      pendingTitle = cleanTitleLine(line);
    }
  }

  if (outputLines.length <= 1) {
    return "";
  }

  outputLines.push("Sub Total");

  return outputLines.join("\n");
}

function buildLayoutText(words: OcrWord[]) {
  const validWords = getValidWords(words);

  if (!validWords.length) {
    return "";
  }

  const rows = groupWordsIntoRows(validWords);

  return rows
    .map((row) => {
      const sortedRow = [...row.words].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const parts: string[] = [];

      for (const [index, word] of sortedRow.entries()) {
        const text = cleanOcrToken(word.text);

        if (!text) continue;

        if (index === 0) {
          parts.push(text);
          continue;
        }

        const previous = sortedRow[index - 1];
        const gap = word.bbox.x0 - previous.bbox.x1;
        const previousWidth = Math.max(1, previous.bbox.x1 - previous.bbox.x0);

        if (gap > previousWidth * 1.3) {
          parts.push("   ");
        } else {
          parts.push(" ");
        }

        parts.push(text);
      }

      return parts.join("").replace(/[ \t]+/g, " ").trim();
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

    const fullPageResult = await worker.recognize(processedBuffer);
    const fullPageData = fullPageResult.data as typeof fullPageResult.data & {
      words?: OcrWord[];
    };

    const words = fullPageData.words ?? [];

    const cropCandidates: TableCropCandidate[] = [];

    const imageBasedCropBuffer = await buildImageBasedTableCropBuffer(
      processedBuffer
    );

    if (imageBasedCropBuffer) {
      cropCandidates.push({
        source: "image",
        buffer: imageBasedCropBuffer,
      });
    }

    const ocrBasedCropBuffer = await buildOcrBasedTableCropBuffer(
      processedBuffer,
      words
    );

    if (ocrBasedCropBuffer) {
      cropCandidates.push({
        source: "ocr",
        buffer: ocrBasedCropBuffer,
      });
    }

    let bestStructuredTableText = "";
    let bestTableCropText = "";
    let bestStructuredScore = 0;

    for (const cropCandidate of cropCandidates) {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
      });

      const cropResult = await worker.recognize(cropCandidate.buffer);
      const cropText = cropResult.data.text ?? "";
      const structuredText = buildStructuredTableTextFromCropText(cropText);
      const structuredScore = scoreStructuredTableText(structuredText);

      if (structuredScore > bestStructuredScore) {
        bestStructuredScore = structuredScore;
        bestStructuredTableText = structuredText;
        bestTableCropText = cropText;
      }
    }

    const layoutText = buildLayoutText(words);
    const plainText = fullPageData.text ?? "";

    return normalizeOcrOutputText(
      [
        bestStructuredTableText,
        bestStructuredTableText ? "" : bestTableCropText,
        layoutText,
        plainText,
      ]
        .filter((value) => value.trim())
        .join("\n\n")
    );
  } finally {
    await worker.terminate();
  }
}