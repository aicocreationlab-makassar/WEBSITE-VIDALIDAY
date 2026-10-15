// Dijalankan sebelum commit: tolak file yang tidak boleh masuk Git.
import { execSync } from "node:child_process";

const atPhaseEnd = process.argv.includes("--phase-end");
const staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const rules = [
  [/^(legacy-laravel|storage-backupunits|tools)\//, "folder lama / alat migrasi"],
  [/(^|\/)\.env(?!\.example$)/, "file env"],
  [/(^|\/)\.next\//, "hasil build"],
  [/(^|\/)node_modules\//, "node_modules"],
  [/(^|\/)(test-results|playwright-report)\//, "hasil uji"],
];
if (atPhaseEnd) rules.push([/dev-preview\//, "halaman dev-preview"]);

const bad = staged.flatMap((file) =>
  rules.filter(([re]) => re.test(file)).map(([, why]) => `${file} (${why})`),
);
if (bad.length) {
  console.error(`guard-staged: file terlarang di-stage:\n${bad.join("\n")}`);
  process.exit(1);
}
console.log(`guard-staged: ${staged.length} file aman`);
