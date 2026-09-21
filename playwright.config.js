// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { SERVER_DIR, CLIENT_DIR, DATABASE_URL, JWT_SECRET } = require('./e2e/env');

// Prerequisites: `npm ci` in server/, client/ and the repo root; `npx playwright install chromium`;
// Postgres running with a leaveflow_e2e database (global-setup resets it on every run).
module.exports = defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  globalSetup: require.resolve('./e2e/global-setup'),
  fullyParallel: false,
  workers: 1, // the specs share one database
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright boots the whole stack itself: the API on 4000 (against leaveflow_e2e) and Vite on 5173.
  // Never reuse an existing server: one pointed at the dev database would make the run lie.
  webServer: [
    {
      command: 'node src/server.js',
      cwd: SERVER_DIR,
      url: 'http://localhost:4000/api/health',
      env: { DATABASE_URL, JWT_SECRET, PORT: '4000' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: CLIENT_DIR,
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
