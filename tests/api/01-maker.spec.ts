import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { generateMakerPayload } from '../../fixtures/test-data';
import { registerMaker } from '../../fixtures/seed';

test.describe('01 - Multi-tenancy (App Maker)', () => {
  test('B3: Register App Maker - Sukses', async ({ request }) => {
    const payload = generateMakerPayload();
    const response = await request.post('/api/maker/register', { data: payload });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    // Assert contract: data.app_key match ^mk_[a-f0-9]+$ dan token ada
    const appKey = body.data.app_key || body.data.maker?.app_key;
    const token = body.data.access_token || body.data.token;

    expect(appKey).toMatch(/^mk_[a-f0-9]+$/);
    expect(token).toBeTruthy();
  });

  test('B4: Register App Maker - Email/Username duplikat', async ({ request }) => {
    const payload = generateMakerPayload();
    const res1 = await request.post('/api/maker/register', { data: payload });
    expect(res1.status()).toBe(201);

    const res2 = await request.post('/api/maker/register', { data: payload });
    // Kontrak: 400 Bad Request
    expect(res2.status()).toBe(400);

    const body = await res2.json();
    assertErrorEnvelope(body, 400);
    expect(body.error).toBe('Bad Request');
  });

  test('B5: Login App Maker - Sukses & Gagal', async ({ request }) => {
    const seed = await registerMaker(request);

    // Sukses
    const successRes = await request.post('/api/maker/login', {
      data: {
        username: seed.credentials.username,
        password: seed.credentials.password,
      },
    });
    expect(successRes.status()).toBe(200);
    const successBody = await successRes.json();
    assertSuccessEnvelope(successBody, 200);
    expect(successBody.data.token || successBody.data.access_token).toBeTruthy();

    // Gagal: password salah
    const failRes = await request.post('/api/maker/login', {
      data: {
        username: seed.credentials.username,
        password: 'WrongPassword123!',
      },
    });
    expect(failRes.status()).toBe(401);
    const failBody = await failRes.json();
    assertErrorEnvelope(failBody, 401);
  });

  test('B6: GET /api/maker/me tanpa token', async ({ request }) => {
    const response = await request.get('/api/maker/me');
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B7: GET /api/maker/stats dengan x-maker-key valid', async ({ request }) => {
    const seed = await registerMaker(request);
    const response = await request.get('/api/maker/stats', {
      headers: { 'x-maker-key': seed.app_key },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const stats = body.data.stats || body.data;
    // Cek semua count adalah number >= 0
    expect(typeof stats.total_users).toBe('number');
    expect(stats.total_users).toBeGreaterThanOrEqual(0);

    expect(typeof stats.total_spaces).toBe('number');
    expect(stats.total_spaces).toBeGreaterThanOrEqual(0);

    expect(typeof stats.total_diskons).toBe('number');
    expect(stats.total_diskons).toBeGreaterThanOrEqual(0);

    expect(typeof stats.total_reservasi).toBe('number');
    expect(stats.total_reservasi).toBeGreaterThanOrEqual(0);
  });
});
