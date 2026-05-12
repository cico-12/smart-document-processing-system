export const MONEY_TOLERANCE = 0.02;

export function isCloseMoney(a?: number, b?: number) {
  if (typeof a !== "number" || typeof b !== "number") {
    return false;
  }

  return Math.abs(a - b) <= MONEY_TOLERANCE;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function removeCurrencyText(value: string) {
  return value
    .replace(/\b(EUR|USD|BAM|GBP|AED|INR|KM)\b/gi, "")
    .replace(/[€$£₹]/g, "");
}

export function parseMoney(value?: string | null) {
  if (!value) {
    return undefined;
  }

  let cleaned = removeCurrencyText(value)
    .replace(/[^\d.,\- '\u00A0’]/g, " ")
    .replace(/[\u00A0’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return undefined;
  }

  const negative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "").trim();

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");
  const hasSpace = /\s/.test(cleaned);

  // OCR sometimes reads 3400.00 as "3400 00".
  if (hasSpace && !hasDot && !hasComma) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const lastPart = parts.at(-1);

    if (parts.length > 1 && lastPart?.length === 2) {
      cleaned = `${parts.slice(0, -1).join("")}.${lastPart}`;
    } else {
      cleaned = parts.join("");
    }
  }

  if (hasSpace && (hasDot || hasComma)) {
    cleaned = cleaned.replace(/\s+/g, "");
  }

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";

    cleaned = cleaned.replaceAll(thousandsSeparator, "");

    if (decimalSeparator === ",") {
      cleaned = cleaned.replace(",", ".");
    }
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    const decimalPart = cleaned.slice(lastComma + 1);

    if (decimals === 1 || decimals === 2 || decimalPart === "000") {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replaceAll(",", "");
    }
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1;
    const decimalPart = cleaned.slice(lastDot + 1);

    if (!(decimals === 1 || decimals === 2 || decimalPart === "000")) {
      cleaned = cleaned.replaceAll(".", "");
    }
  }

  let parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  // OCR fallback:
  // 340000 should usually mean 3400.00.
  // 90000 should usually mean 900.00.
  if (!hasDot && !hasComma && !hasSpace && /^\d+$/.test(cleaned)) {
    if (cleaned.length >= 7 && cleaned.endsWith("000")) {
      parsed = parsed / 1000;
    } else if (cleaned.length >= 5 && cleaned.endsWith("00")) {
      parsed = parsed / 100;
    }
  }

  return roundMoney(negative ? -parsed : parsed);
}