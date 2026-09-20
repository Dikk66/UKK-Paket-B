import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember } from '../../fixtures/seed';
import { generateSpacePayload } from '../../fixtures/test-data';

test.describe('09 - Admin Space CRUD', () => {
  let makerKey: string;
  let adminToken: string;
  let memberToken: string;
  let createdSpaceId: number;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;

    const member = await registerMember(request, makerKey);
    memberToken = member.token;
  });

  test('B36: POST /api/admin/spaces - Create space sukses (201)', async ({ request }) => {
    const payload = generateSpacePayload({
      nama_space: 'Executive Meeting Room Suite',
      tipe: 'meeting_room',
      harga_per_jam: 75000,
      kapasitas: 8,
    });

    const response = await request.post('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: payload,
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    const space = body.data.space || body.data;
    createdSpaceId = space.id;
    expect(space.nama_space).toBe(payload.nama_space);
    expect(space.tipe).toBe(payload.tipe);
  });

  test('B37: POST /api/admin/spaces - Tipe space salah / field kurang (400)', async ({ request }) => {
    const response = await request.post('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        nama_space: 'Ruang Invalid',
        tipe: 'tipe_tidak_dikenal',
        harga_per_jam: 50000,
        kapasitas: 2,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });

  test('B38: GET /api/admin/spaces - List spaces', async ({ request }) => {
    const response = await request.get('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const spaces = Array.isArray(body.data) ? body.data : body.data.spaces;
    expect(Array.isArray(spaces)).toBe(true);
    expect(spaces.length).toBeGreaterThan(0);
  });

  test('B39: GET /api/admin/spaces/{id} - Valid vs Invalid', async ({ request }) => {
    // Valid
    const validRes = await request.get(`/api/admin/spaces/${createdSpaceId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    assertSuccessEnvelope(validBody, 200);

    // Invalid
    const invalidRes = await request.get('/api/admin/spaces/9999999', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(invalidRes.status()).toBe(404);
    const invalidBody = await invalidRes.json();
    assertErrorEnvelope(invalidBody, 404);
  });

  test('B40: PUT /api/admin/spaces/{id} - Partial update', async ({ request }) => {
    const newPrice = 90000;
    const response = await request.put(`/api/admin/spaces/${createdSpaceId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        harga_per_jam: newPrice,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const space = body.data.space || body.data;
    expect(space.harga_per_jam).toBe(newPrice);
  });

  test('B41: DELETE /api/admin/spaces/{id} lalu GET 404', async ({ request }) => {
    // Create temp space to delete
    const tempPayload = generateSpacePayload();
    const createRes = await request.post('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: tempPayload,
    });
    const createBody = await createRes.json();
    const tempId = (createBody.data.space || createBody.data).id;

    // Delete
    const delRes = await request.delete(`/api/admin/spaces/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(delRes.status()).toBe(200);

    // Get lagi -> 404
    const getRes = await request.get(`/api/admin/spaces/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(getRes.status()).toBe(404);
  });

  test('B42: Admin Space routes TANPA Bearer token -> 401', async ({ request }) => {
    const response = await request.get('/api/admin/spaces', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B43: Admin Space routes dengan Member Bearer token -> 403', async ({ request }) => {
    const response = await request.get('/api/admin/spaces', {
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
