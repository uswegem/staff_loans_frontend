// Playwright end-to-end runs (prompt 7, milestone 8). Starts the API from the sibling
// backend repo against an in-memory MongoDB replica set seeded with the prototype's
// fictional sample data, and the web app with Vite on its own port.
//
// Browsers: `npx playwright install chromium`, or set PW_CHANNEL=chrome (or msedge)
// to use an installed browser instead.

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const API_PORT = Number(process.env.E2E_API_PORT || 4100);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 5180);
const BACKEND = process.env.E2E_BACKEND_DIR || path.resolve('..', 'staff_loans_backend');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // one shared, seeded system: the specs run in order
  timeout: 240_000,
  expect: { timeout: 15_000 },
  // A failed test cannot be retried safely without resetting seeded data.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } }],
  webServer: [
    {
      command: 'node scripts/e2e-server.js',
      cwd: BACKEND,
      url: `http://localhost:${API_PORT}/api/v1/health`,
      env: { E2E_API_PORT: String(API_PORT) },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_PROXY: `http://localhost:${API_PORT}` },
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
