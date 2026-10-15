import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs"],
    // Fungsi format tanggal memakai zona Asia/Makassar secara eksplisit,
    // tapi zona proses dikunci supaya test stabil di mesin mana pun.
    env: { TZ: "UTC" },
  },
});
