import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember } from '../../fixtures/seed';
import { generateDiskonPayload } from '../../fixtures/test-data';

test.describe('10 - Admin Diskon CRUD', () => {
  let makerKey: string;
  let adminToken: string;
  let memberToken: string;
  let createdDiskonId: number;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;

    const member = await registerMember(request, makerKey);
    memberToken = member.token;
  });

  test('B36: POST /api/admin/diskon - Create diskon valid (201)', async ({ request }) => {
    const payload = generateDiskonPayload({ persentase_diskon: 25 });
    const response = await request.post('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: payload,
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    const diskon = body.data.diskon || body.data;
    createdDiskonId = diskon.id;
    expect(diskon.nama_diskon).toBe(payload.nama_diskon);
    expect(diskon.persentase_diskon).toBe(25);
  });

  test('B37: POST /api/admin/diskon - Validasi persentase > 100 & tanggal_akhir < tanggal_awal (400)', async ({ request }) => {
    // 1. Persentase > 100
    const resPercent = await request.post('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: generateDiskonPayload({ persentase_diskon: 150 }),
    });
    expect(resPercent.status()).toBe(400);

    // 2. Tanggal akhir < tanggal awal
    const resDate = await request.post('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: generateDiskonPayload({
        tanggal_awal: '2026-12-31',
        tanggal_akhir: '2026-01-01',
      }),
    });
    expect(resDate.status()).toBe(400);
  });

  test('B38: GET /api/admin/diskon - List diskons', async ({ request }) => {
    const response = await request.get('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const diskons = Array.isArray(body.data) ? body.data : body.data.diskons;
    expect(Array.isArray(diskons)).toBe(true);
    expect(diskons.length).toBeGreaterThan(0);
  });

  test('B39: GET /api/admin/diskon/{id} - Valid vs Invalid', async ({ request }) => {
    // Valid
    const validRes = await request.get(`/api/admin/diskon/${createdDiskonId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    assertSuccessEnvelope(validBody, 200);

    // Invalid
    const invalidRes = await request.get('/api/admin/diskon/9999999', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(invalidRes.status()).toBe(404);
    const invalidBody = await invalidRes.json();
    assertErrorEnvelope(invalidBody, 404);
  });

  test('B40: PUT /api/admin/diskon/{id} - Partial update', async ({ request }) => {
    const newPercent = 35;
    const response = await request.put(`/api/admin/diskon/${createdDiskonId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        persentase_diskon: newPercent,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const diskon = body.data.diskon || body.data;
    expect(diskon.persentase_diskon).toBe(newPercent);
  });

  test('B41: DELETE /api/admin/diskon/{id} lalu GET 404', async ({ request }) => {
    // Create temp diskon
    const tempPayload = generateDiskonPayload();
    const createRes = await request.post('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: tempPayload,
    });
    const createBody = await createRes.json();
    const tempId = (createBody.data.diskon || createBody.data).id;

    // Delete
    const delRes = await request.delete(`/api/admin/diskon/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(delRes.status()).toBe(200);

    // Get lagi -> 404
    const getRes = await request.get(`/api/admin/diskon/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(getRes.status()).toBe(404);
  });

  test('B42: Admin Diskon routes TANPA Bearer token -> 401', async ({ request }) => {
    const response = await request.get('/api/admin/diskon', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B43: Admin Diskon routes dengan Member Bearer token -> 403', async ({ request }) => {
    const response = await request.get('/api/admin/diskon', {
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    assertErrorEnvelope(body, 403);
  });
});
