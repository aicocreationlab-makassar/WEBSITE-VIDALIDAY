// Ekspor CSV yang terbuka benar di Excel/Google Sheets: UTF-8 BOM, pemisah koma, CRLF,
// dan penjaga injeksi formula (sel yang diawali = + - @ diberi tanda kutip satu).

const BOM = "﻿";

export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}
