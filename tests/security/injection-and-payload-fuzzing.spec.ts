import { test, expect } from '@playwright/test';
import { registerMaker, registerAdmin } from '../../fixtures/seed';

test.describe('Security: S7, S8, S10, S11 - Injection, Fuzzing & Rate Limit', () => {
  let makerKey: string;
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;
    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;
  });

  test('S7: SQL Injection Payloads tidak menyebabkan bypass auth atau error 500 leak', async ({ request }) => {
    const sqliPayloads = [
      "' OR '1'='1",
      "' OR 1=1 --",
      "admin' --",
      "1; DROP TABLE users;--",
    ];

    for (const payload of sqliPayloads) {
      // 1. Auth bypass attempt
      const loginRes = await request.post('/api/auth/login', {
        headers: { 'x-maker-key': makerKey },
        data: { username: payload, password: 'password' },
      });
      // Pastikan ditolak 400 atau 401, BUKAN 200 (bypass) dan BUKAN 500 (crash)
      expect([400, 401]).toContain(loginRes.status());

      // 2. Search query SQLi
      const searchRes = await request.get(`/api/spaces?search=${encodeURIComponent(payload)}`, {
        headers: { 'x-maker-key': makerKey },
      });
      expect(searchRes.status()).toBe(200); // Harus ditangani secara aman oleh Prisma ORM
    }
  });

  test('S8: XSS Script tags disimpan sebagai string tanpa merusak response', async ({ request }) => {
    const xssPayload = '<script>alert("XSS_PWNED")</script>';

    const spaceRes = await request.post('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        nama_space: `XSS Space ${Date.now()}`,
        tipe: 'desk',
        harga_per_jam: 30000,
        kapasitas: 2,
        deskripsi: xssPayload,
      },
    });
    expect(spaceRes.status()).toBe(201);
    const body = await spaceRes.json();
    const createdSpace = body.data.space || body.data;

    // Pastikan tersimpan dan dikembalikan sebagai teks string utuh tanpa dieksekusi / merusak JSON
    expect(createdSpace.deskripsi).toBe(xssPayload);
  });

  test('S10: Payload Data Type Fuzzing menghasilkan 400 terkontrol, bukan 500', async ({ request }) => {
    const invalidTypes = [
      { harga_per_jam: 'string_bukan_angka', kapasitas: 2, nama_space: 'Test Fuzz 1', tipe: 'desk' },
      { harga_per_jam: [10000, 20000], kapasitas: 'dua', nama_space: 'Test Fuzz 2', tipe: 'desk' },
      { harga_per_jam: { amount: 50000 }, kapasitas: null, nama_space: 'Test Fuzz 3', tipe: 'desk' },
    ];

    for (const payload of invalidTypes) {
      const res = await request.post('/api/admin/spaces', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-maker-key': makerKey,
        },
        data: payload,
      });

      // Server harus merespons 400 Bad Request, bukan 500 unhandled exception
      expect(
        res.status(),
        `Payload fuzzing ${JSON.stringify(payload)} seharusnya merespons 400, bukan ${res.status()}`
      ).toBe(400);
    }
  });

  test('S11: Brute-force & Throttling evaluation on repeated failed logins', async ({ request }) => {
    const attempts = 10;
    const statuses: number[] = [];

    for (let i = 0; i < attempts; i++) {
      const res = await request.post('/api/auth/login', {
        headers: { 'x-maker-key': makerKey },
        data: { username: 'victim_user', password: `WrongPass${i}!` },
      });
      statuses.push(res.status());
    }

    // Evaluasi apakah ada status 429 Too Many Requests
    const hasRateLimit = statuses.includes(429);
    // Catatan: Jika tidak ada rate limit, catat sebagai rekomendasi finding
    expect(statuses.every(s => s === 401 || s === 429)).toBe(true);
  });
});
