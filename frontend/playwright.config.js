import { defineConfig, devices } from "@playwright/test";

// Per docs/TESTING_STRATEGY.md §3.3: run against the real Flask dev server
// (python app.py), not a mock backend. `webServer` below starts it
// automatically for `npm run test:e2e` and tears it down afterward; set
// PW_SKIP_WEBSERVER=1 if you're already running `python app.py` yourself
// (e.g. for faster iteration while writing specs).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",

  use: {
    baseURL: "http://127.0.0.1:5000",
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: process.env.PW_SKIP_WEBSERVER
    ? undefined
    : {
        command: "python ../app.py",
        url: "http://127.0.0.1:5000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
