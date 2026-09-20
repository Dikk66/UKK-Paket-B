import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { generateAdminPayload } from '../../fixtures/test-data';
import { registerMaker, registerMember, registerAdmin } from '../../fixtures/seed';

test.describe('03 - Auth Admin & Profile', () => {
  let makerKey: string;

  test.beforeAll(async ({ request }) => {
    const seed = await registerMaker(request);
    makerKey = seed.app_key;
  });

  test('B13: Register admin-space - Sukses', async ({ request }) => {
    const payload = generateAdminPayload();
    const response = await request.post('/api/auth/register/admin-space', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    assertSuccessEnvelope(body, 201);
    expect(body.data).not.toHaveProperty('password');
  });

  test('B14: Login (member & admin) - Sukses & Gagal', async ({ request }) => {
    const member = await registerMember(request, makerKey);
    const admin = await registerAdmin(request, makerKey);

    // Member login sukses
    const mLogin = await request.post('/api/auth/login', {
      headers: { 'x-maker-key': makerKey },
      data: member.credentials,
    });
    expect(mLogin.status()).toBe(200);
    const mBody = await mLogin.json();
    assertSuccessEnvelope(mBody, 200);

    // Admin login sukses
    const aLogin = await request.post('/api/auth/login', {
      headers: { 'x-maker-key': makerKey },
      data: admin.credentials,
    });
    expect(aLogin.status()).toBe(200);
    const aBody = await aLogin.json();
    assertSuccessEnvelope(aBody, 200);

    // Login gagal kredensial salah
    const failLogin = await request.post('/api/auth/login', {
      headers: { 'x-maker-key': makerKey },
      data: { username: member.credentials.username, password: 'WrongPassword999!' },
    });
    expect(failLogin.status()).toBe(401);
    const failBody = await failLogin.json();
    assertErrorEnvelope(failBody, 401);
  });

  test('B15: GET /api/auth/profile tanpa Bearer token', async ({ request }) => {
    const response = await request.get('/api/auth/profile', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B16: GET /api/auth/profile dengan token member vs admin', async ({ request }) => {
    const member = await registerMember(request, makerKey);
    const admin = await registerAdmin(request, makerKey);

    // Profile Member
    const mRes = await request.get('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${member.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(mRes.status()).toBe(200);
    const mBody = await mRes.json();
    assertSuccessEnvelope(mBody, 200);
    const mRole = mBody.data.role || mBody.data.user?.role;
    expect(mRole).toBe('member');
    const mProfile = mBody.data.member || mBody.data.profile;
    expect(mProfile).toBeDefined();

    // Profile Admin
    const aRes = await request.get('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${admin.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(aRes.status()).toBe(200);
    const aBody = await aRes.json();
    assertSuccessEnvelope(aBody, 200);
    const aRole = aBody.data.role || aBody.data.user?.role;
    expect(aRole).toBe('admin_space');
    const aProfile = aBody.data.space_owner || aBody.data.profile;
    expect(aProfile).toBeDefined();
  });
});
