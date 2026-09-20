import { test, expect } from '@playwright/test';
import { assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember } from '../../fixtures/seed';

test.describe('Security: S3 & S4 - Role Isolation', () => {
  let makerKey: string;
  let memberSeed: any;
  let adminSeed: any;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    memberSeed = await registerMember(request, makerKey);
    adminSeed = await registerAdmin(request, makerKey);
  });

  const adminEndpoints = [
    { method: 'get', url: '/api/admin/profile' },
    { method: 'put', url: '/api/admin/profile' },
    { method: 'get', url: '/api/admin/members' },
    { method: 'post', url: '/api/admin/members' },
    { method: 'get', url: '/api/admin/spaces' },
    { method: 'post', url: '/api/admin/spaces' },
    { method: 'get', url: '/api/admin/diskon' },
    { method: 'post', url: '/api/admin/diskon' },
    { method: 'get', url: '/api/admin/reservasi' },
    { method: 'get', url: '/api/admin/reports/monthly?month=1&year=2026' },
    { method: 'get', url: '/api/admin/reports/income?month=1&year=2026' },
  ];

  test('S3: Token Member dipakai ke endpoint admin -> konsisten 403 Forbidden', async ({ request }) => {
    for (const ep of adminEndpoints) {
      const res = await (request as any)[ep.method](ep.url, {
        headers: {
          Authorization: `Bearer ${memberSeed.token}`,
          'x-maker-key': makerKey,
        },
      });

      expect(
        res.status(),
        `Endpoint ${ep.method.toUpperCase()} ${ep.url} dengan token member harus 403, bukan ${res.status()}`
      ).toBe(403);

      const body = await res.json();
      assertErrorEnvelope(body, 403);
    }
  });

  test('S4: Token Admin dipakai ke endpoint privat member (/api/reservasi/my)', async ({ request }) => {
    const response = await request.get('/api/reservasi/my', {
      headers: {
        Authorization: `Bearer ${adminSeed.token}`,
        'x-maker-key': makerKey,
      },
    });

    // Endpoint privat member harus menolak role admin_space (403) atau 400 karena tidak punya profil member
    expect([400, 403]).toContain(response.status());
    const body = await response.json();
    assertErrorEnvelope(body, response.status());
  });
});
