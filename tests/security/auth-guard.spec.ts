import { test, expect } from '@playwright/test';
import { assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker } from '../../fixtures/seed';

test.describe('Security: S1 & S2 - Auth Guard', () => {
  let makerKey: string;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;
  });

  const protectedEndpoints = [
    { method: 'get', url: '/api/auth/profile' },
    { method: 'get', url: '/api/reservasi/my' },
    { method: 'get', url: '/api/reservasi/my/history' },
    { method: 'post', url: '/api/reservasi' },
    { method: 'get', url: '/api/admin/profile' },
    { method: 'get', url: '/api/admin/members' },
    { method: 'post', url: '/api/admin/members' },
    { method: 'get', url: '/api/admin/spaces' },
    { method: 'post', url: '/api/admin/spaces' },
    { method: 'get', url: '/api/admin/diskon' },
    { method: 'post', url: '/api/admin/diskon' },
    { method: 'get', url: '/api/admin/reservasi' },
    { method: 'get', url: '/api/admin/reports/monthly?month=1&year=2026' },
  ];

  test('S1: Akses endpoint terproteksi TANPA header Authorization -> konsisten 401', async ({ request }) => {
    for (const ep of protectedEndpoints) {
      const res = await (request as any)[ep.method](ep.url, {
        headers: { 'x-maker-key': makerKey },
      });

      expect(
        res.status(),
        `Endpoint ${ep.method.toUpperCase()} ${ep.url} tanpa auth header seharusnya 401, bukan ${res.status()}`
      ).toBe(401);

      const body = await res.json();
      assertErrorEnvelope(body, 401);
    }
  });

  test('S2: Akses endpoint terproteksi dengan malformed Bearer token -> 401, bukan 500', async ({ request }) => {
    const malformedToken = 'Bearer token_asal_asalan_rusak_xyz123';

    for (const ep of protectedEndpoints) {
      const res = await (request as any)[ep.method](ep.url, {
        headers: {
          Authorization: malformedToken,
          'x-maker-key': makerKey,
        },
      });

      expect(
        res.status(),
        `Endpoint ${ep.method.toUpperCase()} ${ep.url} dengan token rusak harus 401, bukan ${res.status()}`
      ).toBe(401);

      const body = await res.json();
      assertErrorEnvelope(body, 401);
    }
  });
});
