import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { generateMemberPayload } from '../../fixtures/test-data';
import { registerMaker } from '../../fixtures/seed';

test.describe('02 - Auth Member', () => {
  let makerKey: string;

  test.beforeAll(async ({ request }) => {
    const seed = await registerMaker(request);
    makerKey = seed.app_key;
  });

  test('B8: Register member - Semua field wajib valid', async ({ request }) => {
    const payload = generateMemberPayload();
    const response = await request.post('/api/auth/register/member', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    // Response TIDAK boleh mengandung password mentah
    expect(body.data).not.toHaveProperty('password');
    if (body.data.user) {
      expect(body.data.user).not.toHaveProperty('password');
    }
  });

  test('B9: Register member - Field wajib kosong', async ({ request }) => {
    const requiredFields = [
      'username',
      'password',
      'nama_member',
      'instansi',
      'alamat',
      'telp',
    ];

    for (const field of requiredFields) {
      const payload = generateMemberPayload();
      delete payload[field as keyof typeof payload];

      const response = await request.post('/api/auth/register/member', {
        headers: { 'x-maker-key': makerKey },
        data: payload,
      });

      expect(
        response.status(),
        `Field '${field}' yang kosong seharusnya mengembalikan status 400`
      ).toBe(400);

      const body = await response.json();
      assertErrorEnvelope(body, 400);
    }
  });

  test('B10: Register member - Password < 6 karakter', async ({ request }) => {
    const payload = generateMemberPayload({ password: '123' });
    const response = await request.post('/api/auth/register/member', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });

  test('B11: Register member - Username duplikat', async ({ request }) => {
    const payload = generateMemberPayload();
    const res1 = await request.post('/api/auth/register/member', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    expect(res1.status()).toBe(201);

    const res2 = await request.post('/api/auth/register/member', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    expect(res2.status()).toBe(400);

    const body = await res2.json();
    assertErrorEnvelope(body, 400);
  });

  test('B12: Register member TANPA header x-maker-key', async ({ request }) => {
    const payload = generateMemberPayload();
    const response = await request.post('/api/auth/register/member', {
      data: payload,
    });

    // Harus ditolak 400 atau 401
    expect([400, 401]).toContain(response.status());
    const body = await response.json();
    assertErrorEnvelope(body, response.status());
  });
});
