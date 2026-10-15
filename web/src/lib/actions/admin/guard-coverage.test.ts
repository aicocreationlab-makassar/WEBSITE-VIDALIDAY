// Pengaman statis: setiap Server Action admin dan route handler admin wajib memanggil guardAdmin()/requireAdmin()
// (proxy.ts tidak melindungi Server Action). Gagal kalau ada fungsi yang lupa.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const ACTIONS_DIR = path.join(ROOT, "lib/actions/admin");
const ADMIN_APP_DIR = path.join(ROOT, "app/admin");

/** Aksi yang memang boleh tanpa sesi admin (masuk/keluar/lupa sandi). */
const PUBLIC_ACTIONS = new Set([
  "auth.ts:signIn",
  "auth.ts:signOut",
  "auth.ts:requestPasswordReset",
  "auth.ts:updatePassword",
]);

function walk(dir: string, match: (file: string) => boolean): string[] {
  let out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full, match));
    else if (match(full)) out.push(full);
  }
  return out;
}

/** Potong isi fungsi export async bernama → teks badan fungsi (cukup untuk pemeriksaan sederhana). */
function exportedAsyncFunctions(source: string): { name: string; body: string }[] {
  const result: { name: string; body: string }[] = [];
  const pattern = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = source.indexOf("{", source.indexOf(")", match.index));
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    result.push({ name: match[1], body: source.slice(start, end + 1) });
  }
  return result;
}

describe("admin guard coverage", () => {
  it("every exported admin Server Action calls guardAdmin() or requireAdmin()", () => {
    const files = walk(ACTIONS_DIR, (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (!/^["']use server["'];?/m.test(source)) continue;
      for (const fn of exportedAsyncFunctions(source)) {
        const key = `${path.basename(file)}:${fn.name}`;
        if (PUBLIC_ACTIONS.has(key)) continue;
        if (!/\b(guardAdmin|requireAdmin)\s*\(/.test(fn.body)) missing.push(key);
      }
    }
    expect(missing, `Action tanpa pengecekan admin: ${missing.join(", ")}`).toEqual([]);
  });

  it("every admin route handler calls requireAdmin() or guardAdmin()", () => {
    const files = walk(ADMIN_APP_DIR, (f) => /route\.tsx?$/.test(f));
    const missing = files.filter((file) => !/\b(guardAdmin|requireAdmin|getAdminStatus)\s*\(/.test(readFileSync(file, "utf8")));
    expect(missing.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});
