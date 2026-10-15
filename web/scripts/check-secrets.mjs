// Gagal kalau bundle klien berisi secret Supabase atau env non-publik.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".next/static";
const PATTERNS = [
  [/sb_secret_[A-Za-z0-9_-]+/, "secret key Supabase"],
  [/service_role/i, "kata service_role"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/process\.env\.(?!NEXT_PUBLIC_|NODE_ENV\b)[A-Z_][A-Z0-9_]*/, "env non-publik"],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;

const hits = [];
function walk(path) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) {
    console.error(`check-secrets: ${path} tidak ada (jalankan build dulu)`);
    process.exit(1);
  }
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) walk(join(path, name));
    return;
  }
  if (!/\.(js|css|json|txt|html|map)$/.test(path)) return;
  const text = readFileSync(path, "utf8");
  for (const [re, label] of PATTERNS) if (re.test(text)) hits.push(`${path}: ${label}`);
  for (const token of text.match(JWT) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") hits.push(`${path}: JWT service_role`);
    } catch {
      // bukan JWT valid, abaikan
    }
  }
}
walk(root);

if (hits.length) {
  console.error(`Secret ditemukan di bundle klien:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`check-secrets: bersih (${root})`);
