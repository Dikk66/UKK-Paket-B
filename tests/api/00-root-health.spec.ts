import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope } from '../../fixtures/schema';

test.describe('00 - Root & Health Endpoints', () => {
  test('B1: GET / - Status online', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);
    expect(body.data.status).toBe('online');
  });

  test('B2: GET /health - Server healthy status ok', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);
    expect(body.data.status).toBe('ok');
  });
});
