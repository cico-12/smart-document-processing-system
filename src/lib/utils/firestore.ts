export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) {
    return null as T;
  }

  if (value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeForFirestore(item),
      ])
    ) as T;
  }

  return value;
}