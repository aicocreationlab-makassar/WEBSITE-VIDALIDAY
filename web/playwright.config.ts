import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Mesin pengembangan lambat (2 CPU): hasil /sewa dan detail di-stream setelah kerangka statis.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    channel: "chrome",
    locale: "id-ID",
    timezoneId: "Asia/Makassar",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "m390",
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
    {
      name: "d1280",
      use: { viewport: { width: 1280, height: 800 }, channel: "chrome" },
    },
  ],
});
