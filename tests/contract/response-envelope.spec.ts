import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerMember } from '../../fixtures/seed';

test.describe('Contract: Response Envelope Validation', () => {
  let makerKey: string;

  test.beforeAll(async ({ request }) => {
    const seed = await registerMaker(request);
    makerKey = seed.app_key;
  });

  test('Envelope format for 200 OK (GET /health)', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertSuccessEnvelope(body, 200);
  });

  test('Envelope format for 201 Created (POST /api/auth/register/member)', async ({ request }) => {
    const memSeed = await registerMember(request, makerKey);
    // Registration was successful and envelope is verified
    expect(memSeed.user).toBeDefined();
  });

  test('Envelope format for 400 Bad Request (POST /api/maker/register with invalid data)', async ({ request }) => {
    const res = await request.post('/api/maker/register', {
      data: { name: 'Incomplete' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    assertErrorEnvelope(body, 400);
  });

  test('Envelope format for 401 Unauthorized (GET /api/auth/profile without token)', async ({ request }) => {
    const res = await request.get('/api/auth/profile', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    assertErrorEnvelope(body, 401);
  });

  test('Envelope format for 403 Forbidden (Member accesses Admin route)', async ({ request }) => {
    const member = await registerMember(request, makerKey);
    const res = await request.get('/api/admin/spaces', {
      headers: {
        Authorization: `Bearer ${member.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    assertErrorEnvelope(body, 403);
  });

  test('Envelope format for 404 Not Found (GET /api/non-existent-route)', async ({ request }) => {
    const res = await request.get('/api/non-existent-route');
    expect(res.status()).toBe(404);
    const body = await res.json();
    assertErrorEnvelope(body, 404);
  });
});
