import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  timeout: 20_000,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  workers: 1, // Penting: banyak test bergantung urutan data (create → read → update → delete)
});
