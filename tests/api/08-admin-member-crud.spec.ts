import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember } from '../../fixtures/seed';
import { generateMemberPayload } from '../../fixtures/test-data';

test.describe('08 - Admin Member CRUD', () => {
  let makerKey: string;
  let adminToken: string;
  let memberToken: string;
  let createdMemberId: number;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;

    const member = await registerMember(request, makerKey);
    memberToken = member.token;
  });

  test('B36: POST /api/admin/members - Create member sukses (201)', async ({ request }) => {
    const payload = generateMemberPayload();
    const response = await request.post('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: payload,
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);
    const memberData = body.data.member || body.data;
    createdMemberId = memberData.id;
    expect(memberData.nama_member).toBe(payload.nama_member);
    expect(memberData).not.toHaveProperty('password');
  });

  test('B37: POST /api/admin/members - Field wajib kosong (400)', async ({ request }) => {
    const response = await request.post('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        nama_member: 'Tanpa Username dan Password',
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });

  test('B38: GET /api/admin/members - List & search', async ({ request }) => {
    const response = await request.get('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const members = Array.isArray(body.data) ? body.data : body.data.members;
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThan(0);
  });

  test('B39: GET /api/admin/members/{id} - Valid vs Invalid', async ({ request }) => {
    // Valid
    const validRes = await request.get(`/api/admin/members/${createdMemberId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    assertSuccessEnvelope(validBody, 200);

    // Invalid
    const invalidRes = await request.get('/api/admin/members/9999999', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(invalidRes.status()).toBe(404);
    const invalidBody = await invalidRes.json();
    assertErrorEnvelope(invalidBody, 404);
  });

  test('B40: PUT /api/admin/members/{id} - Partial update', async ({ request }) => {
    const updatedName = 'Nama Member Baru Terupdate';
    const response = await request.put(`/api/admin/members/${createdMemberId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        nama_member: updatedName,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const member = body.data.member || body.data;
    expect(member.nama_member).toBe(updatedName);
  });

  test('B41: DELETE /api/admin/members/{id} lalu GET 404', async ({ request }) => {
    // Create member khusus untuk dihapus
    const tempPayload = generateMemberPayload();
    const createRes = await request.post('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: tempPayload,
    });
    const createBody = await createRes.json();
    const tempId = (createBody.data.member || createBody.data).id;

    // Delete
    const delRes = await request.delete(`/api/admin/members/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(delRes.status()).toBe(200);

    // Get lagi -> 404
    const getRes = await request.get(`/api/admin/members/${tempId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(getRes.status()).toBe(404);
  });

  test('B42: Admin Member endpoint TANPA Bearer token -> 401', async ({ request }) => {
    const response = await request.get('/api/admin/members', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B43: Admin Member endpoint dengan Member Bearer token -> 403', async ({ request }) => {
    const response = await request.get('/api/admin/members', {
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
