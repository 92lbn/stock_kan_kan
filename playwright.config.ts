import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: { trace: "on-first-retry", ...devices["Desktop Chrome"] },
  webServer: [
    { command: "npm run dev --workspace @stock-kan-kan/app-planning", url: "http://127.0.0.1:3000/login", reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: "npm run dev --workspace @stock-kan-kan/app-stock", url: "http://127.0.0.1:3001/login", reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
