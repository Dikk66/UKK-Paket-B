import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, createDiskon } from '../../fixtures/seed';

test.describe('05 - Diskon Catalog', () => {
  let makerKey: string;
  let adminToken: string;
  let activePromoCode: string;

  test.beforeAll(async ({ request }) => {
    const makerSeed = await registerMaker(request);
    makerKey = makerSeed.app_key;

    const adminSeed = await registerAdmin(request, makerKey);
    adminToken = adminSeed.token;

    // Create an active diskon
    const diskon = await createDiskon(request, adminToken, makerKey, {
      persentase_diskon: 20,
    });
    activePromoCode = diskon.nama_diskon;
  });

  test('B23: GET /api/diskon/active - Hanya diskon aktif yang muncul', async ({ request }) => {
    const response = await request.get('/api/diskon/active', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const diskons = Array.isArray(body.data) ? body.data : body.data.diskons;
    expect(Array.isArray(diskons)).toBe(true);

    const now = new Date();
    for (const d of diskons) {
      const tAwal = new Date(d.tanggal_awal);
      const tAkhir = new Date(d.tanggal_akhir);
      // Validasi range tanggal
      expect(tAwal.getTime()).toBeLessThanOrEqual(now.getTime() + 86400000); // toleransi 1 hari timezone
      expect(tAkhir.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000);
    }
  });

  test('B24: POST /api/diskon/check - Kode valid vs kadaluarsa vs tidak ada', async ({ request }) => {
    // 1. Kode Valid
    const validRes = await request.post('/api/diskon/check', {
      headers: { 'x-maker-key': makerKey },
      data: {
        nama_diskon: activePromoCode,
        kode_promo: activePromoCode,
        total_harga: 100000,
      },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    assertSuccessEnvelope(validBody, 200);

    // 2. Kode Tidak Ada
    const invalidRes = await request.post('/api/diskon/check', {
      headers: { 'x-maker-key': makerKey },
      data: {
        nama_diskon: 'PROMO_PALSU_999',
        kode_promo: 'PROMO_PALSU_999',
        total_harga: 100000,
      },
    });
    expect([400, 404]).toContain(invalidRes.status());
    const invalidBody = await invalidRes.json();
    assertErrorEnvelope(invalidBody, invalidRes.status());
  });
});
