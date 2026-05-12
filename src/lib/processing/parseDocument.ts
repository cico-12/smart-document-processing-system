import { parseCsvDocument } from "@/lib/processing/parseCsvDocument";
import { ExtractedDocument, LineItem } from "@/types/document";
import { isCloseMoney, parseMoney, roundMoney } from "@/lib/utils/money";
import { normalizeText } from "@/lib/utils/strings";

type ParseDocumentInput = {
  rawText: string;
  fileName: string;
  fileType: string;
};

type HeaderColumn = "description" | "quantity" | "unitPrice" | "amount" | "tax";

type TableHeaderMatch = {
  startIndex: number;
  endIndex: number;
  headerLine: string;
};

type TableBlock = {
  headerLine: string;
  headerColumns: HeaderColumn[];
  bodyLines: string[];
};

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

const STOP_LABELS = [
  "Supplier",
  "Vendor",
  "Company",
  "Bill From",
  "Bill To",
  "Invoice To",
  "Remit To",
  "Invoice No",
  "Invoice Number",
  "Number",
  "Purchase Order Number",
  "PO Number",
  "Date",
  "Issue Date",
  "Invoice Date",
  "Order Date",
  "Due Date",
  "Description",
  "Category",
  "Product Name",
  "Item",
  "Qty",
  "Quantity",
  "Rate",
  "Unit Price",
  "Price",
  "Amount",
  "Subtotal",
  "Sub Total",
  "Tax",
  "VAT",
  "TVA",
  "Grand Total",
  "Amount Due",
  "Total Due",
  "Total",
  "Currency",
  "Payment",
  "Terms",
];

const TABLE_END_PATTERN =
  /\b(?:Subtotal|Sub Total|Subtotal without VAT|Total H\.?T\.?|Total HT|Tax due|Tax Rate|Tax|VAT|TVA|Grand Total|Total Due|Amount Due|Balance Due|Cash Payment|Terms|Thank you|Other Comments|Make all checks payable)\b/i;

function cleanValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labelToRegex(label: string) {
  return escapeRegex(label).replace(/\s+/g, "\\s+");
}

function addSyntheticLineBreaks(text: string) {
  let value = text.replace(/\r\n?/g, "\n");

  const headerPatterns = [
    /\b(Description\s+Qty\s+Unit\s+Price\s+Total)\b/gi,
    /\b(Description\s+Quantity\s+Unit\s+Price\s+Total)\b/gi,
    /\b(Description\s+Qty\s+Rate\s+Amount)\b/gi,
    /\b(Description\s+Quantity\s+Rate\s+Amount)\b/gi,
    /\b(Category\s+Rate\s+Quantity\s+Price)\b/gi,
    /\b(Category\s+Rate\s+Qty\s+Price)\b/gi,
    /\b(Item\s+Qty\s+Unit\s+Price\s+Amount)\b/gi,
    /\b(Item\s+Quantity\s+Unit\s+Price\s+Amount)\b/gi,
    /\b(Product\s+Name\s+Qty\s+Unit\s+Price\s+Amount)\b/gi,
    /\b(Product\s+Name\s+Quantity\s+Unit\s+Price\s+Amount)\b/gi,
  ];

  for (const pattern of headerPatterns) {
    value = value.replace(pattern, "\n$1\n");
  }

  value = value.replace(
    /\s+\b(Subtotal without VAT|Subtotal|Sub Total|Total H\.?T\.?|Total HT|Tax due|Tax\s*\(\s*\d+(?:[.,]\d+)?\s*%\s*\)|Tax\s*:|VAT|TVA|Grand Total|Total Due|Amount Due|Balance Due|Cash Payment|Terms|Thank you|Other Comments|Make all checks payable)\b/gi,
    "\n$1"
  );

  return value;
}

function getCleanLines(text: string) {
  return addSyntheticLineBreaks(text)
    .split("\n")
    .map((line) => cleanValue(line))
    .filter(Boolean);
}

function normalizeOcrText(rawText: string) {
  return normalizeText(rawText)
    .replace(/[|]+/g, " ")
    .replace(/\bS\s*U\s*B\s*T\s*O\s*T\s*A\s*L\b/gi, "Subtotal")
    .replace(/\bSUB\s+TOTAL\b/gi, "Sub Total")
    .replace(/\bT\s*O\s*T\s*A\s*L\b/gi, "Total")
    .replace(/\bINVOICE\s+N0\b/gi, "Invoice No")
    .replace(/\bINVOICE\s+NO\b/gi, "Invoice No")
    .replace(/\bQ\s*TY\b/gi, "Qty")
    .replace(/\bQUANTIT[YV]\b/gi, "Quantity");
}

function detectDocumentType(text: string): ExtractedDocument["documentType"] {
  const lower = text.toLowerCase();

  if (
    lower.includes("purchase order") ||
    /\bpo[-\s#:]/i.test(text) ||
    lower.includes("purchase no")
  ) {
    return "purchase_order";
  }

  if (
    lower.includes("invoice") ||
    lower.includes("tax invoice") ||
    lower.includes("facture")
  ) {
    return "invoice";
  }

  return "unknown";
}

function isBadExtractedValue(value?: string) {
  if (!value) return true;

  const lower = value.toLowerCase();

  return STOP_LABELS.some((label) => lower === label.toLowerCase());
}

function cleanupSupplierName(value?: string) {
  if (!value) return undefined;

  const stopPattern = STOP_LABELS.map(labelToRegex).join("|");

  const cleaned = cleanValue(value)
    .replace(new RegExp(`\\s+(?:${stopPattern})\\b.*$`, "i"), "")
    .replace(/\b(P\s*:|W\s*:|Phone|Email|Address|A\/C|Terms)\b.*$/i, "")
    .replace(/[.:,;]+$/, "")
    .trim();

  if (isBadExtractedValue(cleaned)) {
    return undefined;
  }

  if (/^\d/.test(cleaned)) {
    return undefined;
  }

  return cleaned;
}

function extractInvoiceToCompany(text: string) {
  const lines = getCleanLines(text);

  for (const [index, line] of lines.entries()) {
    const invoiceToMatch = line.match(/\bINVOICE\s+TO\b\s*:?\s*(.*)$/i);

    if (!invoiceToMatch) continue;

    const inlineValue = cleanupSupplierName(invoiceToMatch[1]);

    if (inlineValue) {
      return inlineValue;
    }

    for (let offset = 1; offset <= 4; offset += 1) {
      const candidate = cleanupSupplierName(lines[index + offset]);

      if (candidate) {
        return candidate;
      }
    }
  }

  const compactText = cleanValue(text);

  const match = compactText.match(
    /\bINVOICE\s+TO\b\s+(.+?)(?=\s+\d{1,5}[,\s]|P\s*:|W\s*:|CATEGORY|DESCRIPTION|PRODUCT|SUB\s*TOTAL|TOTAL\s+DUE|TOTAL)/i
  );

  const value = cleanupSupplierName(match?.[1]);

  if (value && !/^invoice$/i.test(value)) {
    return value;
  }

  return undefined;
}

function extractLabeledValue(text: string, labels: string[]) {
  const lines = getCleanLines(text);

  for (const label of labels) {
    const labelPattern = new RegExp(
      `^${labelToRegex(label)}\\b\\s*[:\\-]?\\s*(.*)$`,
      "i"
    );

    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(labelPattern);

      if (!match) continue;

      const inlineValue = cleanupSupplierName(match[1]);

      if (inlineValue) return inlineValue;

      for (let offset = 1; offset <= 3; offset += 1) {
        const nextLine = cleanupSupplierName(lines[index + offset]);

        if (nextLine) return nextLine;
      }
    }
  }

  const stopPattern = STOP_LABELS.map(labelToRegex).join("|");

  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\b)${labelToRegex(
        label
      )}\\b\\s*[:\\-]?\\s*(.+?)(?=\\s+(?:${stopPattern})\\b|\\n|$)`,
      "i"
    );

    const match = text.match(pattern);
    const value = cleanupSupplierName(match?.[1]);

    if (value) return value;
  }

  return undefined;
}

function fallbackSupplierName(text: string) {
  const lines = getCleanLines(text);

  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase();

    if (
      lower.includes("invoice") ||
      lower.includes("facture") ||
      lower.includes("date") ||
      lower.includes("number") ||
      lower.includes("total") ||
      lower.includes("supplier") ||
      lower.includes("description")
    ) {
      continue;
    }

    if (
      /\b(company|co\.?|ltd\.?|llc|inc|pvt|supply|technologies|credit)\b/i.test(
        line
      )
    ) {
      return cleanupSupplierName(line);
    }
  }

  return undefined;
}

function cleanDocumentNumber(value?: string) {
  if (!value) return undefined;

  let cleaned = cleanValue(value)
    .replace(/\s*-\s*/g, "-")
    .replace(/[.:,;]+$/, "")
    .trim();

  cleaned = cleaned.replace(/\b(INV|PO|TXT)\s*#\s*/i, (_, prefix) => {
    return `${String(prefix).toUpperCase()} #`;
  });

  cleaned = cleaned.replace(/\b(INV|PO|TXT)\s+(?=\d)/i, (_, prefix) => {
    return `${String(prefix).toUpperCase()}-`;
  });

  if (!cleaned || /^invoice$/i.test(cleaned) || /^number$/i.test(cleaned)) {
    return undefined;
  }

  return cleaned;
}

function extractDocumentNumber(text: string, fileName: string) {
  const patterns = [
    /\b(INV\s*#\s*\d+)\b/i,
    /\b(INV-\d+)\b/i,
    /\b(PO-\d+)\b/i,
    /\b(PO\s*#\s*\d+)\b/i,
    /\bInvoice\s*(?:No\.?|Number|#)\s*[:#\-]?\s*(INV\s*#?\s*\d+|#?\s*[A-Z0-9][A-Z0-9\-\/]*)/i,
    /\bPurchase\s*Order\s*(?:No\.?|Number|#)\s*[:#\-]?\s*(PO\s*[-#: ]\s*[A-Z0-9][A-Z0-9\-\/]*|#?\s*[A-Z0-9][A-Z0-9\-\/]*)/i,
    /\b(PO\s*[-#: ]\s*[A-Z0-9][A-Z0-9\-\/]*)\b/i,
    /\bNumber\s*[:#\-]?\s*(#?\s*[A-Z0-9][A-Z0-9\-\/]*)/i,
    /\bFacture\s+Proforma\s+N[°o]?\s*#?\s*(\d+)/i,
    /\bInvoice\s+(\d{3,})\b/i,
    /(#\s*\d{2,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = cleanDocumentNumber(match?.[1]);

    if (value) return value;
  }

  return fileName.replace(/\.[^/.]+$/, "");
}

function normalizeYear(value: string) {
  if (value.length === 2) {
    const year = Number(value);
    return year > 70 ? `19${value}` : `20${value}`;
  }

  return value;
}

function normalizeDate(value?: string) {
  if (!value) return undefined;

  const trimmed = cleanValue(value).replace(",", "");

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const numericMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (numericMatch) {
    const [, firstRaw, secondRaw, yearRaw] = numericMatch;
    const first = Number(firstRaw);
    const second = Number(secondRaw);
    const year = normalizeYear(yearRaw);

    let day = firstRaw;
    let month = secondRaw;

    if (first <= 12 && second > 12) {
      month = firstRaw;
      day = secondRaw;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthNameMatch = trimmed.match(
    /^(\d{1,2})[\s-]+([A-Za-z]+)[\s-]+(\d{2,4})$/i
  );

  if (monthNameMatch) {
    const [, day, monthRaw, yearRaw] = monthNameMatch;
    const month = MONTHS[monthRaw.toLowerCase()];
    const year = normalizeYear(yearRaw);

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return trimmed;
}

function findDateInText(value: string) {
  const match = value.match(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}[\s-]+[A-Za-z]+[\s-]+\d{2,4})\b/i
  );

  return match?.[1];
}

function extractDateValue(text: string, labels: string[]) {
  const compactText = cleanValue(text);

  const datePattern =
    String.raw`(\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}[\s-]+[A-Za-z]+[\s-]+\d{2,4})`;

  for (const label of labels) {
    const pattern = new RegExp(
      `${labelToRegex(label)}\\s*[:\\-]?\\s*${datePattern}`,
      "i"
    );

    const match = compactText.match(pattern);

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  const lines = getCleanLines(text);

  for (const label of labels) {
    const labelPattern = new RegExp(labelToRegex(label), "i");

    for (let index = 0; index < lines.length; index += 1) {
      if (!labelPattern.test(lines[index])) continue;

      const sameLineDate = findDateInText(lines[index]);

      if (sameLineDate) {
        return sameLineDate;
      }

      for (let offset = 1; offset <= 3; offset += 1) {
        const nextLineDate = findDateInText(lines[index + offset] ?? "");

        if (nextLineDate) {
          return nextLineDate;
        }
      }
    }
  }

  return undefined;
}

function extractCurrency(text: string) {
  const currencyMatch = text.match(/\b(EUR|USD|BAM|GBP|AED|INR|KM)\b/i);

  if (currencyMatch?.[1]) {
    const value = currencyMatch[1].toUpperCase();
    return value === "KM" ? "BAM" : value;
  }

  if (text.includes("€")) return "EUR";
  if (text.includes("$")) return "USD";
  if (text.includes("£")) return "GBP";
  if (text.includes("₹")) return "INR";

  return undefined;
}

function extractLineNumbers(value: string) {
  const numbers: number[] = [];

  const numberPattern =
    /(?:[$€£₹]\s*)?-?\d+(?:[.,]\d{1,2})?(?:\s*(?:USD|EUR|BAM|GBP|AED|INR|KM))?/gi;

  for (const match of value.matchAll(numberPattern)) {
    const raw = match[0];
    const endIndex = (match.index ?? 0) + raw.length;
    const nextCharacter = value.slice(endIndex, endIndex + 1);

    if (nextCharacter === "%") continue;

    const parsed = parseMoney(raw);

    if (typeof parsed === "number") {
      numbers.push(parsed);
    }
  }

  return numbers;
}

function isLikelyTableHeaderLine(line: string) {
  const lower = line.toLowerCase();

  const hasDescriptionColumn =
    /\b(category|description|product\s+name|item)\b/i.test(lower);

  const hasNumericColumn =
    /\b(rate|price|unit\s+price|quantity|qty|amount|total)\b/i.test(lower);

  return hasDescriptionColumn && hasNumericColumn;
}

function extractAmountByLabels(text: string, labels: string[]) {
  const compactText = cleanValue(text);

  for (const label of labels) {
    const labelPattern = labelToRegex(label);

    const pattern = new RegExp(
      `\\b${labelPattern}\\b\\s*[:\\-]?\\s*(?:VAT\\s*)?(?:\\(\\s*\\d+(?:[.,]\\d+)?%\\s*\\)\\s*)?(?:\\d+(?:[.,]\\d+)?%\\s*)?(?:of\\s+\\d+(?:[.,]\\d+)?\\s*)?(?:[$€£₹]\\s*)?(-?\\d[\\d.,]*)`,
      "i"
    );

    const match = compactText.match(pattern);

    if (!match?.[1]) continue;

    const parsed = parseMoney(match[1]);

    if (typeof parsed === "number" && parsed >= 0) {
      return parsed;
    }
  }

  const lines = getCleanLines(text);

  for (const label of labels) {
    const labelPattern = new RegExp(labelToRegex(label), "i");

    for (let index = 0; index < lines.length; index += 1) {
      if (!labelPattern.test(lines[index])) continue;
      if (isLikelyTableHeaderLine(lines[index])) continue;

      const sameLineNumbers = extractLineNumbers(lines[index]);

      if (sameLineNumbers.length) {
        return sameLineNumbers.at(-1);
      }

      for (let offset = 1; offset <= 2; offset += 1) {
        const nextLine = lines[index + offset] ?? "";

        if (isLikelyTableHeaderLine(nextLine)) continue;

        const nextLineNumbers = extractLineNumbers(nextLine);

        if (nextLineNumbers.length) {
          return nextLineNumbers.at(-1);
        }
      }
    }
  }

  return undefined;
}

function extractAmountCandidatesByLabels(text: string, labels: string[]) {
  const compactText = cleanValue(text);
  const matches: number[] = [];

  for (const label of labels) {
    const labelPattern = labelToRegex(label);

    const pattern = new RegExp(
      `\\b${labelPattern}\\b\\s*[:\\-]?\\s*(?:VAT\\s*)?(?:\\(\\s*\\d+(?:[.,]\\d+)?%\\s*\\)\\s*)?(?:\\d+(?:[.,]\\d+)?%\\s*)?(?:of\\s+\\d+(?:[.,]\\d+)?\\s*)?(?:[$€£₹]\\s*)?(-?\\d[\\d.,]*)`,
      "gi"
    );

    for (const match of compactText.matchAll(pattern)) {
      const parsed = parseMoney(match[1]);

      if (typeof parsed === "number" && parsed >= 0) {
        matches.push(parsed);
      }
    }
  }

  const lines = getCleanLines(text);

  for (const label of labels) {
    const labelPattern = new RegExp(labelToRegex(label), "i");

    for (let index = 0; index < lines.length; index += 1) {
      if (!labelPattern.test(lines[index])) continue;
      if (isLikelyTableHeaderLine(lines[index])) continue;

      const sameLineNumbers = extractLineNumbers(lines[index]);

      if (sameLineNumbers.length) {
        matches.push(sameLineNumbers.at(-1)!);
        continue;
      }

      for (let offset = 1; offset <= 1; offset += 1) {
        const nextLine = lines[index + offset] ?? "";

        if (isLikelyTableHeaderLine(nextLine)) continue;

        const nextLineNumbers = extractLineNumbers(nextLine);

        if (nextLineNumbers.length) {
          matches.push(nextLineNumbers.at(-1)!);
        }
      }
    }
  }

  return Array.from(new Set(matches));
}

function extractTaxAmount(text: string) {
  const compactText = cleanValue(text);

  const directTaxPatterns = [
    /\bTax\b\s*[:\-]?\s*(?:VAT\s*)?(?:\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*)?(?:\d+(?:[.,]\d+)?%\s*)?(?:of\s+\d+(?:[.,]\d+)?\s*)?(?:[$€£₹]\s*)?(-?\d[\d.,]*)/i,
    /\bTax\s+due\b\s*[:\-]?\s*(?:VAT\s*)?(?:\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*)?(?:\d+(?:[.,]\d+)?%\s*)?(?:of\s+\d+(?:[.,]\d+)?\s*)?(?:[$€£₹]\s*)?(-?\d[\d.,]*)/i,
    /\bTotal\s+(?:VAT|TVA|T\.V\.A\.)\b\s*[:\-]?\s*(?:\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*)?(?:\d+(?:[.,]\d+)?%\s*)?(?:[$€£₹]\s*)?(-?\d[\d.,]*)/i,
    /\b(?:VAT|TVA|T\.V\.A\.)\b\s*[:\-]?\s*(?:\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*)?(?:\d+(?:[.,]\d+)?%\s*)?(?:[$€£₹]\s*)?(-?\d[\d.,]*)/i,
  ];

  for (const pattern of directTaxPatterns) {
    const match = compactText.match(pattern);

    if (!match?.[1]) continue;

    const parsed = parseMoney(match[1]);

    if (typeof parsed === "number" && parsed >= 0) {
      return parsed;
    }
  }

  const candidates = [
    ...extractAmountCandidatesByLabels(text, [
      "Total VAT",
      "Total T.V.A.",
      "Total TVA",
    ]),
    ...extractAmountCandidatesByLabels(text, ["Tax due", "Tax"]),
    ...extractAmountCandidatesByLabels(text, ["VAT", "TVA"]),
  ];

  return candidates[0];
}

function cleanItemDescription(value: string) {
  return cleanValue(value)
    .replace(/\s+lorem ipsum.*$/i, "")
    .replace(/\s+dolor sit.*$/i, "")
    .replace(/\s+consectetur.*$/i, "")
    .replace(/\s+adipiscing.*$/i, "")
    .replace(/[.:,;]+$/, "")
    .trim();
}

function isLikelyQuantity(value: number) {
  return value > 0 && value <= 1000 && Number.isInteger(value);
}

function isValidLineItem(item: LineItem) {
  if (!item.description) return false;
  if (!isLikelyQuantity(item.quantity)) return false;
  if (item.unitPrice <= 0) return false;
  if (item.amount < 0) return false;

  return isCloseMoney(roundMoney(item.quantity * item.unitPrice), item.amount);
}

function addHeaderColumn(
  columns: Array<{ index: number; column: HeaderColumn }>,
  index: number | undefined,
  column: HeaderColumn
) {
  if (typeof index !== "number" || index < 0) return;

  columns.push({
    index,
    column,
  });
}

function addHeaderMatches(
  header: string,
  columns: Array<{ index: number; column: HeaderColumn }>,
  pattern: RegExp,
  column: HeaderColumn
) {
  for (const match of header.matchAll(pattern)) {
    addHeaderColumn(columns, match.index, column);
  }
}

function detectHeaderColumns(headerLine: string): HeaderColumn[] {
  const header = headerLine.toLowerCase();
  const columns: Array<{ index: number; column: HeaderColumn }> = [];

  addHeaderMatches(
    header,
    columns,
    /\b(category|description|product\s+name|item)\b/gi,
    "description"
  );

  addHeaderMatches(header, columns, /\b(qty|quantity|qt[eé])\b/gi, "quantity");

  addHeaderMatches(
    header,
    columns,
    /\b(rate|unit\s+price|prix\s+unitaire)\b/gi,
    "unitPrice"
  );

  addHeaderMatches(
    header,
    columns,
    /\b(amount|line\s+total|total|prix\s+ttc)\b/gi,
    "amount"
  );

  addHeaderMatches(header, columns, /\b(vat|tax|tva)\b/gi, "tax");

  const hasExplicitUnitPrice =
    /\b(rate|unit\s+price|prix\s+unitaire)\b/i.test(header);
  const hasExplicitAmount =
    /\b(amount|line\s+total|total|prix\s+ttc)\b/i.test(header);

  for (const match of header.matchAll(/\bprice\b/gi)) {
    const index = match.index ?? -1;
    const before = header.slice(Math.max(0, index - 8), index).trim();

    if (before.endsWith("unit")) {
      continue;
    }

    addHeaderColumn(
      columns,
      index,
      hasExplicitUnitPrice && !hasExplicitAmount ? "amount" : "unitPrice"
    );
  }

  const sortedColumns = columns.sort((a, b) => a.index - b.index);

  const uniqueColumns: Array<{ index: number; column: HeaderColumn }> = [];

  for (const entry of sortedColumns) {
    const duplicateAtSamePosition = uniqueColumns.some(
      (existing) =>
        existing.column === entry.column && Math.abs(existing.index - entry.index) <= 2
    );

    if (!duplicateAtSamePosition) {
      uniqueColumns.push(entry);
    }
  }

  return uniqueColumns.map((entry) => entry.column);
}

function getNumericHeaderColumns(headerColumns: HeaderColumn[]) {
  return headerColumns.filter(
    (column) => column !== "description" && column !== "tax"
  );
}

function mapLineItemByHeader(
  description: string,
  numbers: number[],
  headerColumns: HeaderColumn[]
): LineItem | null {
  const usableColumns = getNumericHeaderColumns(headerColumns);

  if (usableColumns.length < 3 || numbers.length < 3) {
    return null;
  }

  const mapped: Partial<LineItem> = {
    description,
  };

  let numberIndex = 0;

  for (const column of usableColumns) {
    const value = numbers[numberIndex];

    if (typeof value !== "number") continue;

    if (column === "quantity") mapped.quantity = value;
    if (column === "unitPrice") mapped.unitPrice = value;
    if (column === "amount") mapped.amount = value;

    numberIndex += 1;
  }

  if (
    typeof mapped.quantity === "number" &&
    typeof mapped.unitPrice === "number" &&
    typeof mapped.amount === "number"
  ) {
    const item = {
      description,
      quantity: mapped.quantity,
      unitPrice: mapped.unitPrice,
      amount: mapped.amount,
    };

    if (isValidLineItem(item)) {
      return item;
    }
  }

  return null;
}

function inferLineItem(description: string, numbers: number[]): LineItem | null {
  if (numbers.length < 3) return null;

  const candidates: LineItem[] = [];

  for (let quantityIndex = 0; quantityIndex < numbers.length; quantityIndex += 1) {
    const quantity = numbers[quantityIndex];

    if (!isLikelyQuantity(quantity)) continue;

    for (
      let unitPriceIndex = 0;
      unitPriceIndex < numbers.length;
      unitPriceIndex += 1
    ) {
      if (unitPriceIndex === quantityIndex) continue;

      const unitPrice = numbers[unitPriceIndex];

      if (unitPrice <= 0) continue;

      for (let amountIndex = 0; amountIndex < numbers.length; amountIndex += 1) {
        if (amountIndex === quantityIndex || amountIndex === unitPriceIndex) {
          continue;
        }

        const amount = numbers[amountIndex];

        if (isCloseMoney(roundMoney(quantity * unitPrice), amount)) {
          candidates.push({
            description,
            quantity,
            unitPrice,
            amount,
          });
        }
      }
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates.sort((a, b) => {
    if (a.amount !== b.amount) {
      return b.amount - a.amount;
    }

    return b.unitPrice - a.unitPrice;
  })[0];
}

function findTableHeader(lines: string[]): TableHeaderMatch | null {
  for (let index = 0; index < lines.length; index += 1) {
    for (let span = 0; span <= 5; span += 1) {
      const headerLine = lines.slice(index, index + span + 1).join(" ");
      const lower = headerLine.toLowerCase();

      const hasDescriptionColumn =
        /\b(category|description|product\s+name|item)\b/i.test(lower);
      const hasNumericColumn =
        /\b(rate|price|unit\s+price|quantity|qty|amount|total)\b/i.test(lower);

      if (hasDescriptionColumn && hasNumericColumn) {
        return {
          startIndex: index,
          endIndex: index + span,
          headerLine,
        };
      }
    }
  }

  return null;
}

function getTableBlock(text: string): TableBlock | null {
  const lines = getCleanLines(text);
  const header = findTableHeader(lines);

  if (!header) {
    return null;
  }

  let endIndex = lines.length;

  for (let index = header.endIndex + 1; index < lines.length; index += 1) {
    if (TABLE_END_PATTERN.test(lines[index])) {
      endIndex = index;
      break;
    }
  }

  const headerColumns = detectHeaderColumns(header.headerLine);

  return {
    headerLine: header.headerLine,
    headerColumns,
    bodyLines: lines.slice(header.endIndex + 1, endIndex),
  };
}

function isLikelyItemTitle(line: string) {
  const cleaned = cleanItemDescription(line);

  if (!cleaned) return false;
  if (cleaned.length < 3) return false;
  if (TABLE_END_PATTERN.test(cleaned)) return false;

  if (
    /\b(category|description|product\s+name|qty|quantity|rate|unit\s+price|price|amount|total)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  if (
    /\b(lorem|ipsum|consectetur|adipiscing|vestibulum|terms|conditions|payment|bank|phone|email|www|http|thank you)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  if (/^[$€£₹]?\d/.test(cleaned)) return false;

  const numbers = extractLineNumbers(cleaned);

  if (numbers.length >= 2) {
    return false;
  }

  return /[A-Za-z]/.test(cleaned);
}

function parseTableLines(lines: string[], headerColumns: HeaderColumn[]) {
  const items: LineItem[] = [];
  let pendingDescription: string | undefined;

  for (const line of lines) {
    if (!line || TABLE_END_PATTERN.test(line)) {
      break;
    }

    if (
      /\b(category|description|product\s+name|qty|quantity|rate|unit\s+price|price|amount|total)\b/i.test(
        line
      )
    ) {
      continue;
    }

    const firstNumberIndex = line.search(/[$€£₹]?\d/);
    const numbers = extractLineNumbers(line);

    if (firstNumberIndex > 0 && numbers.length >= 3) {
      const description = cleanItemDescription(line.slice(0, firstNumberIndex));

      if (description) {
        const item =
          mapLineItemByHeader(description, numbers, headerColumns) ??
          inferLineItem(description, numbers);

        if (item) {
          items.push(item);
          pendingDescription = undefined;
          continue;
        }
      }
    }

    if (pendingDescription && numbers.length >= 3) {
      const item =
        mapLineItemByHeader(pendingDescription, numbers, headerColumns) ??
        inferLineItem(pendingDescription, numbers);

      if (item) {
        items.push(item);
        pendingDescription = undefined;
        continue;
      }
    }

    if (isLikelyItemTitle(line)) {
      pendingDescription = cleanItemDescription(line);
    }
  }

  return items;
}

function getTableItemTitles(lines: string[]) {
  const titles: string[] = [];

  for (const line of lines) {
    const title = cleanItemDescription(line);

    if (!isLikelyItemTitle(title)) continue;

    const alreadyExists = titles.some(
      (existing) => existing.toLowerCase() === title.toLowerCase()
    );

    if (!alreadyExists) {
      titles.push(title);
    }
  }

  return titles;
}

function getTableNumbers(lines: string[]) {
  const numbers: number[] = [];

  for (const line of lines) {
    if (!line || TABLE_END_PATTERN.test(line)) {
      break;
    }

    numbers.push(...extractLineNumbers(line).filter((number) => number >= 0));
  }

  return numbers;
}

function getExpectedItemCountFromTable(block: TableBlock) {
  const numericColumns = getNumericHeaderColumns(block.headerColumns);
  const numbers = getTableNumbers(block.bodyLines);
  const titles = getTableItemTitles(block.bodyLines);

  if (
    numericColumns.length >= 3 &&
    numbers.length >= numericColumns.length &&
    numbers.length % numericColumns.length === 0
  ) {
    return numbers.length / numericColumns.length;
  }

  if (titles.length) {
    return titles.length;
  }

  return undefined;
}

function limitTitlesToExpectedCount(titles: string[], expectedCount?: number) {
  if (!expectedCount || titles.length <= expectedCount) {
    return titles;
  }

  return titles.slice(0, expectedCount);
}

function buildItemsFromRowMajorNumbers(
  titles: string[],
  numbers: number[],
  headerColumns: HeaderColumn[],
  expectedCount?: number
) {
  const numericColumns = getNumericHeaderColumns(headerColumns);

  if (titles.length === 0 || numericColumns.length < 3) {
    return [];
  }

  const items: LineItem[] = [];
  const columnCount = numericColumns.length;
  const rowCount = Math.min(titles.length, expectedCount ?? titles.length);

  for (let index = 0; index < rowCount; index += 1) {
    const start = index * columnCount;
    const values = numbers.slice(start, start + columnCount);

    if (values.length < columnCount) {
      break;
    }

    const item =
      mapLineItemByHeader(titles[index], values, headerColumns) ??
      inferLineItem(titles[index], values);

    if (item) {
      items.push(item);
    }
  }

  return items;
}

function buildItemsFromColumnMajorNumbers(
  titles: string[],
  numbers: number[],
  headerColumns: HeaderColumn[],
  expectedCount?: number
) {
  const numericColumns = getNumericHeaderColumns(headerColumns);

  if (titles.length === 0 || numericColumns.length < 3) {
    return [];
  }

  const rowCount = Math.min(titles.length, expectedCount ?? titles.length);
  const neededNumberCount = rowCount * numericColumns.length;

  if (numbers.length < neededNumberCount) {
    return [];
  }

  const items: LineItem[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const values = numericColumns.map((_, columnIndex) => {
      return numbers[columnIndex * rowCount + rowIndex];
    });

    const item =
      mapLineItemByHeader(titles[rowIndex], values, headerColumns) ??
      inferLineItem(titles[rowIndex], values);

    if (item) {
      items.push(item);
    }
  }

  return items;
}

function scoreLineItems(items: LineItem[], expectedCount?: number) {
  let score = 0;

  for (const item of items) {
    score += 10;

    if (isValidLineItem(item)) {
      score += 40;
    } else {
      score -= 25;
    }

    if (item.description.length >= 3) {
      score += 5;
    }

    if (
      /\b(lorem|ipsum|consectetur|payment|terms|phone|email|www)\b/i.test(
        item.description
      )
    ) {
      score -= 30;
    }
  }

  if (expectedCount && items.length === expectedCount) {
    score += 35;
  }

  if (expectedCount && items.length > expectedCount) {
    score -= (items.length - expectedCount) * 15;
  }

  if (expectedCount && items.length < expectedCount) {
    score -= (expectedCount - items.length) * 10;
  }

  return score;
}

function uniqueLineItems(lineItems: LineItem[]) {
  const uniqueItems: LineItem[] = [];

  for (const item of lineItems) {
    const alreadyExists = uniqueItems.some(
      (existing) =>
        existing.description.toLowerCase() === item.description.toLowerCase() &&
        isCloseMoney(existing.quantity, item.quantity) &&
        isCloseMoney(existing.unitPrice, item.unitPrice) &&
        isCloseMoney(existing.amount, item.amount)
    );

    if (!alreadyExists) {
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

function pickBestLineItems(candidates: LineItem[][], expectedCount?: number) {
  const usableCandidates = candidates
    .map(uniqueLineItems)
    .filter((candidate) => candidate.length > 0);

  if (!usableCandidates.length) {
    return [];
  }

  return usableCandidates.sort((a, b) => {
    return scoreLineItems(b, expectedCount) - scoreLineItems(a, expectedCount);
  })[0];
}

function extractHeaderAwareLineItemsFromBlock(block: TableBlock) {
  const expectedCount = getExpectedItemCountFromTable(block);
  const titles = limitTitlesToExpectedCount(
    getTableItemTitles(block.bodyLines),
    expectedCount
  );
  const numbers = getTableNumbers(block.bodyLines);

  if (!titles.length || !numbers.length) {
    return [];
  }

  const rowMajorItems = buildItemsFromRowMajorNumbers(
    titles,
    numbers,
    block.headerColumns,
    expectedCount
  );

  const columnMajorItems = buildItemsFromColumnMajorNumbers(
    titles,
    numbers,
    block.headerColumns,
    expectedCount
  );

  return pickBestLineItems([rowMajorItems, columnMajorItems], expectedCount);
}

function extractLineItemsFromTable(text: string): LineItem[] {
  const block = getTableBlock(text);

  if (!block) {
    return [];
  }

  const expectedCount = getExpectedItemCountFromTable(block);
  const directRowItems = parseTableLines(block.bodyLines, block.headerColumns);
  const headerAwareItems = extractHeaderAwareLineItemsFromBlock(block);

  return pickBestLineItems([directRowItems, headerAwareItems], expectedCount);
}

function normalizeExtractedMoney(
  extracted: ExtractedDocument & { totalCandidates?: number[] }
): ExtractedDocument & { totalCandidates?: number[] } {
  const lineItems = extracted.lineItems.map((item) => ({
    ...item,
    quantity: roundMoney(item.quantity),
    unitPrice: roundMoney(item.unitPrice),
    amount: roundMoney(item.amount),
  }));

  const calculatedSubtotal = lineItems.length
    ? roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0))
    : undefined;

  let subtotal = extracted.subtotal;
  let tax = extracted.tax;
  let total = extracted.total;

  if (typeof subtotal !== "number" && typeof calculatedSubtotal === "number") {
    subtotal = calculatedSubtotal;
  }

  if (
    typeof subtotal === "number" &&
    typeof calculatedSubtotal === "number" &&
    subtotal > calculatedSubtotal * 10 &&
    isCloseMoney(subtotal / 100, calculatedSubtotal)
  ) {
    subtotal = calculatedSubtotal;
  }

  if (
    typeof subtotal === "number" &&
    typeof tax === "number" &&
    typeof total !== "number"
  ) {
    total = roundMoney(subtotal + tax);
  }

  if (
    typeof subtotal === "number" &&
    typeof total === "number" &&
    typeof tax !== "number" &&
    total >= subtotal
  ) {
    tax = roundMoney(total - subtotal);
  }

  if (
    typeof subtotal === "number" &&
    typeof tax === "number" &&
    typeof total === "number"
  ) {
    const expectedTotal = roundMoney(subtotal + tax);

    if (total > expectedTotal * 10) {
      total = expectedTotal;
    }
  }

  return {
    ...extracted,
    lineItems,
    subtotal,
    tax,
    total,
  };
}

export function parseTextLikeDocument(
  rawText: string,
  fileName: string
): ExtractedDocument & { totalCandidates?: number[] } {
  const text = normalizeOcrText(rawText);

  const documentType = detectDocumentType(text);

  const supplierName =
    extractInvoiceToCompany(text) ??
    extractLabeledValue(text, [
      "Supplier",
      "Vendor",
      "Company",
      "Bill From",
      "Invoice To",
      "Bill To",
      "Remit To",
    ]) ??
    fallbackSupplierName(text);

  const documentNumber = extractDocumentNumber(text, fileName);

  const issueDate = normalizeDate(
    extractDateValue(text, [
      "Issue Date",
      "Invoice Date",
      "Order Date",
      "Date de Facturation",
      "Dated",
      "Date",
    ])
  );

  const dueDate = normalizeDate(
    extractDateValue(text, ["Due Date", "Date d'échéance", "Date echeance"])
  );

  const currency = extractCurrency(text);

  const lineItems = extractLineItemsFromTable(text);

  const calculatedSubtotal = lineItems.length
    ? roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0))
    : undefined;

  const extractedSubtotal = extractAmountByLabels(text, [
    "Subtotal without VAT",
    "Subtotal",
    "Sub Total",
    "Total H.T.",
    "Total HT",
    "Base HT",
  ]);

  const subtotal = extractedSubtotal ?? calculatedSubtotal;

  const tax = extractTaxAmount(text);

  const totalCandidates = [
    ...extractAmountCandidatesByLabels(text, ["Total Due"]),
    ...extractAmountCandidatesByLabels(text, ["Grand Total", "Balance Due"]),
    ...extractAmountCandidatesByLabels(text, [
      "Total TTC",
      "Total GBP",
      "Total EUR",
      "Total USD",
      "Total BAM",
      "Total AED",
      "Total INR",
    ]),
    ...extractAmountCandidatesByLabels(text, ["Amount Due"]),
    ...extractAmountCandidatesByLabels(text, ["Total"]),
  ];

  const uniqueTotalCandidates = Array.from(new Set(totalCandidates));

  const expectedTotal =
    typeof subtotal === "number" && typeof tax === "number"
      ? roundMoney(subtotal + tax)
      : undefined;

  const total =
    typeof expectedTotal === "number"
      ? uniqueTotalCandidates.find((candidate) =>
          isCloseMoney(candidate, expectedTotal)
        ) ?? uniqueTotalCandidates[0]
      : uniqueTotalCandidates[0];

  return normalizeExtractedMoney({
    documentType,
    supplierName,
    documentNumber,
    issueDate,
    dueDate,
    currency,
    lineItems,
    subtotal,
    tax,
    total,
    totalCandidates: uniqueTotalCandidates,
  } as ExtractedDocument & { totalCandidates?: number[] });
}

export function parseDocument({
  rawText,
  fileName,
  fileType,
}: ParseDocumentInput): ExtractedDocument & { totalCandidates?: number[] } {
  const lowerFileName = fileName.toLowerCase();
  const lowerFileType = fileType.toLowerCase();

  if (lowerFileType.includes("csv") || lowerFileName.endsWith(".csv")) {
    return parseCsvDocument(rawText, fileName);
  }

  return parseTextLikeDocument(rawText, fileName);
}