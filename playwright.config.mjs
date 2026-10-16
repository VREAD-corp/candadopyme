import { defineConfig } from '@playwright/test';
const BASE = process.env.BASE || 'http://localhost:4517/';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalTeardown: './tests/e2e/teardown.mjs',
  use: { baseURL: BASE, locale: 'es-CL', timezoneId: 'America/Santiago', screenshot: 'only-on-failure' },
  projects: [
    { name: 'movil-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'escritorio-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.BASE ? undefined : { command: 'node tools/serve.mjs', url: BASE, reuseExistingServer: true },
});
