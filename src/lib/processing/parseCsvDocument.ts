import Papa from "papaparse";
import { ExtractedDocument, LineItem } from "@/types/document";
import { roundMoney } from "@/lib/utils/money";

type CsvRow = Record<string, unknown>;

function getStringValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getNumberValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function normalizeCsvRowKeys(row: CsvRow): CsvRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.trim().toLowerCase().replace(/\s+/g, "_"),
      value,
    ])
  );
}

export function parseCsvDocument(rawText: string, fileName: string): ExtractedDocument {
  const result = Papa.parse<CsvRow>(rawText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const lineItems: LineItem[] = result.data
    .map(normalizeCsvRowKeys)
    .map((row) => {
      const description = getStringValue(row, [
        "desc",
        "description",
        "item",
        "name",
      ]);

      const quantity = getNumberValue(row, ["qty", "quantity"]);
      const unitPrice = getNumberValue(row, [
        "price",
        "unit_price",
        "unitprice",
      ]);

      const amount =
        getNumberValue(row, ["total", "amount", "line_total"]) ||
        roundMoney(quantity * unitPrice);

      return {
        description: description || "CSV item",
        quantity,
        unitPrice,
        amount,
      };
    })
    .filter((item) => item.quantity > 0 || item.unitPrice > 0 || item.amount > 0);

  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.amount, 0)
  );

  return {
    documentType: "unknown",
    documentNumber: `CSV-${fileName.replace(/\.[^/.]+$/, "")}`,
    lineItems,
    subtotal,
    total: subtotal,
  };
}