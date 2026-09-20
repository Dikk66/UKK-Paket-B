import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember } from '../../fixtures/seed';

test.describe('07 - Admin Profile', () => {
  let makerKey: string;
  let adminSeed: any;
  let memberSeed: any;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    adminSeed = await registerAdmin(request, makerKey);
    memberSeed = await registerMember(request, makerKey);
  });

  test('B44: PUT /api/admin/profile - Data profil berubah sesuai payload', async ({ request }) => {
    const newCoworking = 'Updated Coworking Space Elite';
    const newOwner = 'Updated Master Owner';

    const response = await request.put('/api/admin/profile', {
      headers: {
        Authorization: `Bearer ${adminSeed.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        nama_coworking: newCoworking,
        nama_pemilik: newOwner,
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const profile = body.data.profile || body.data;
    expect(profile.nama_coworking).toBe(newCoworking);
    expect(profile.nama_pemilik).toBe(newOwner);
  });

  test('Admin Profile: Guard tanpa Bearer token (401)', async ({ request }) => {
    const response = await request.get('/api/admin/profile', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('Admin Profile: Guard dengan Member Bearer token (403)', async ({ request }) => {
    const response = await request.get('/api/admin/profile', {
      headers: {
        Authorization: `Bearer ${memberSeed.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    assertErrorEnvelope(body, 403);
  });
});
