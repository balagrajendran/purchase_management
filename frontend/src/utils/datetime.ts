// src/utils/datetime.ts
export function formatDateTime(
  value: unknown,
  locale: string = "en-IN",
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
) {
  if (value == null) return "—";

  // Normalize to Date
  const d =
    value instanceof Date
      ? value
      : typeof value === "number"
      ? new Date(value) // epoch millis
      : new Date(String(value)); // ISO/string

  // Invalid date? (e.g. server sent empty string)
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString(locale, opts);
}

export function formatDate(
  value: unknown,
  locale = "en-IN",
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
) {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale, opts);
}
