import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, registerMember, createSpace } from '../../fixtures/seed';

test.describe('12 - Admin Reports', () => {
  let makerKeyA: string;
  let adminA: any;
  let memberA: any;
  let spaceA: any;

  let makerKeyB: string;
  let adminB: any;

  test.beforeAll(async ({ request }) => {
    // Maker A & Admin A
    const seedA = await registerMaker(request);
    makerKeyA = seedA.app_key;
    adminA = await registerAdmin(request, makerKeyA);
    memberA = await registerMember(request, makerKeyA);

    spaceA = await createSpace(request, adminA.token, makerKeyA, {
      nama_space: 'Report Test Space A',
      harga_per_jam: 50000,
    });

    // Buat reservasi di Maker A
    const resA = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKeyA,
      },
      data: {
        id_space: spaceA.id,
        tanggal_reservasi: '2026-11-25',
        jam_mulai: '09:00',
        durasi_jam: 2,
      },
    });
    const resABody = await resA.json();
    const resAId = (resABody.data.reservasi || resABody.data).id;

    // Approve & check-in & check-out agar status 'selesai'
    await request.patch(`/api/admin/reservasi/${resAId}/status`, {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
      data: { status: 'disetujui' },
    });
    await request.post(`/api/admin/reservasi/${resAId}/check-in`, {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
    });
    await request.post(`/api/admin/reservasi/${resAId}/check-out`, {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
    });

    // Maker B & Admin B
    const seedB = await registerMaker(request);
    makerKeyB = seedB.app_key;
    adminB = await registerAdmin(request, makerKeyB);
  });

  test('B51: GET /api/admin/reports/monthly?month&year', async ({ request }) => {
    const response = await request.get('/api/admin/reports/monthly?month=11&year=2026', {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const report = body.data;
    expect(report).toHaveProperty('summary');
    expect(report.summary.total_reservasi).toBeGreaterThanOrEqual(1);
    expect(typeof (report.summary.total_pendapatan_selesai ?? report.summary.total_pendapatan)).toBe('number');
  });

  test('B52: GET /api/admin/reports/income konsisten dengan monthly', async ({ request }) => {
    const monthlyRes = await request.get('/api/admin/reports/monthly?month=11&year=2026', {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
    });
    const monthlyBody = await monthlyRes.json();
    const monthlyTotal = monthlyBody.data.summary.total_pendapatan_selesai;

    const incomeRes = await request.get('/api/admin/reports/income?month=11&year=2026', {
      headers: {
        Authorization: `Bearer ${adminA.token}`,
        'x-maker-key': makerKeyA,
      },
    });
    expect(incomeRes.status()).toBe(200);
    const incomeBody = await incomeRes.json();
    assertSuccessEnvelope(incomeBody, 200);

    const incomeTotal = incomeBody.data.summary.total_pendapatan;
    expect(incomeTotal).toBe(monthlyTotal);
  });

  test('B53: Admin A tidak melihat data reservasi/space milik Admin B (beda maker)', async ({ request }) => {
    // Admin B query report pada bulan 11 tahun 2026
    const reportB = await request.get('/api/admin/reports/monthly?month=11&year=2026', {
      headers: {
        Authorization: `Bearer ${adminB.token}`,
        'x-maker-key': makerKeyB,
      },
    });
    expect(reportB.status()).toBe(200);
    const bodyB = await reportB.json();

    // Data Admin A (spaceA) TIDAK boleh ada di report Admin B
    const spacesB = bodyB.data.by_space || [];
    const foundSpaceA = spacesB.some((s: any) => s.space_id === spaceA.id);
    expect(foundSpaceA).toBe(false);
  });
});
