import { test, expect } from '@playwright/test';
import {
  registerMaker,
  registerAdmin,
  registerMember,
  createSpace,
} from '../../fixtures/seed';

test.describe('Performance: P1 & P2 - Response Time SLA', () => {
  let makerKey: string;
  let adminToken: string;
  let memberToken: string;
  let spaceId: number;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;
    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;
    const member = await registerMember(request, makerKey);
    memberToken = member.token;

    const space = await createSpace(request, adminToken, makerKey, {
      nama_space: 'Perf Test Space',
    });
    spaceId = space.id;
  });

  test('P1: Response time GET katalog < 1000ms', async ({ request }) => {
    const endpoints: { name: string; url: string; headers: Record<string, string> }[] = [
      { name: 'GET /api/spaces', url: '/api/spaces', headers: { 'x-maker-key': makerKey } },
      { name: 'GET /api/diskon/active', url: '/api/diskon/active', headers: { 'x-maker-key': makerKey } },
      {
        name: 'GET /api/admin/reports/monthly',
        url: '/api/admin/reports/monthly?month=1&year=2026',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-maker-key': makerKey },
      },
    ];

    for (const ep of endpoints) {
      const start = Date.now();
      const res = await request.get(ep.url, { headers: ep.headers });
      const duration = Date.now() - start;

      expect(res.status()).toBe(200);
      expect(
        duration,
        `Response time untuk ${ep.name} adalah ${duration}ms (SLA: < 1000ms)`
      ).toBeLessThan(1000);
    }
  });

  test('P2: Response time kalkulasi reservasi & reporting < 1500ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-12-15',
        jam_mulai: '08:00',
        durasi_jam: 4,
      },
    });
    const duration = Date.now() - start;

    expect(res.status()).toBe(201);
    expect(
      duration,
      `Kalkulasi pembuatan reservasi memakan waktu ${duration}ms (SLA: < 1500ms)`
    ).toBeLessThan(1500);
  });
});
