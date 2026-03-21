function applyCustomFormat(date: Date, format: string): string {
  return format
    .replace("YYYY", String(date.getFullYear()))
    .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("DD", String(date.getDate()).padStart(2, "0"));
}

export type DateFormat = "iso" | "us" | "eu" | "custom";

export function getCurrentDate(
  format: DateFormat = "iso",
  customFormat?: string,
): { date: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  let result: string;
  switch (format) {
    case "us":
      result = `${month}/${day}/${year}`;
      break;
    case "eu":
      result = `${day}/${month}/${year}`;
      break;
    case "custom":
      result = applyCustomFormat(now, customFormat ?? "YYYY-MM-DD");
      break;
    default:
      result = `${year}-${month}-${day}`;
      break;
  }

  return { date: result };
}
