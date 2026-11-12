import { defineConfig, devices } from "@playwright/test";

// E2E runs against the workerd preview (the real runtime), not `next dev`. Build first: `npm run cf:build`.
const baseURL = process.env.BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "phone-360", use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 } } },
    { name: "iphone-390", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx opennextjs-cloudflare preview --port 8787",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
