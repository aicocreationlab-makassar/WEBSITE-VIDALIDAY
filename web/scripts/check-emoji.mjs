// Gagal kalau ada emoji di file sumber (CLAUDE.md: tanpa emoji di UI, data seed, dan teks default).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".sql", ".json", ".md"]);
const SKIP = new Set(["node_modules", ".next", "test-results", "playwright-report"]);
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/u;

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push("src");

const hits = [];
function walk(path) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) if (!SKIP.has(name)) walk(join(path, name));
    return;
  }
  if (!EXT.has(extname(path))) return;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (EMOJI.test(line)) hits.push(`${path}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
}
roots.forEach(walk);

if (hits.length) {
  console.error(`Emoji ditemukan (${hits.length}):\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`check-emoji: bersih (${roots.join(", ")})`);
