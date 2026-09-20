import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import {
  registerMaker,
  registerAdmin,
  registerMember,
  createSpace,
} from '../../fixtures/seed';

test.describe('11 - Admin Reservasi Management', () => {
  let makerKey: string;
  let adminToken: string;
  let memberToken: string;
  let spaceId: number;
  let reservasiId: number;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;

    const admin = await registerAdmin(request, makerKey);
    adminToken = admin.token;

    const member = await registerMember(request, makerKey);
    memberToken = member.token;

    const space = await createSpace(request, adminToken, makerKey, {
      nama_space: 'Space for Management Test',
      harga_per_jam: 40000,
    });
    spaceId = space.id;

    // Create a reservation for admin management tests
    const res = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-20',
        jam_mulai: '10:00',
        durasi_jam: 2,
      },
    });
    const resBody = await res.json();
    reservasiId = (resBody.data.reservasi || resBody.data).id;
  });

  test('B45: GET /api/admin/reservasi dengan kombinasi filter', async ({ request }) => {
    // Filter status
    const resStatus = await request.get('/api/admin/reservasi?status=belum_dikonfirm', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(resStatus.status()).toBe(200);
    const bodyStatus = await resStatus.json();
    assertSuccessEnvelope(bodyStatus, 200);

    // Filter id_space
    const resSpace = await request.get(`/api/admin/reservasi?id_space=${spaceId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(resSpace.status()).toBe(200);
    const bodySpace = await resSpace.json();
    assertSuccessEnvelope(bodySpace, 200);

    // Filter tanggal
    const resTanggal = await request.get('/api/admin/reservasi?tanggal=2026-11-20', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(resTanggal.status()).toBe(200);
    const bodyTanggal = await resTanggal.json();
    assertSuccessEnvelope(bodyTanggal, 200);
  });

  test('B46: PATCH /api/admin/reservasi/{id}/status - Transisi valid (belum_dikonfirm -> disetujui)', async ({ request }) => {
    const response = await request.patch(`/api/admin/reservasi/${reservasiId}/status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: { status: 'disetujui' },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);
    const updated = body.data.reservasi || body.data;
    expect(updated.status).toBe('disetujui');
  });

  test('B47: PATCH /api/admin/reservasi/{id}/status - Transisi ke status tidak dikenal (400)', async ({ request }) => {
    const response = await request.patch(`/api/admin/reservasi/${reservasiId}/status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
      data: { status: 'status_ngawur_123' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });

  test('B48: POST /api/admin/reservasi/{id}/check-in sebelum status disetujui (400)', async ({ request }) => {
    // Buat reservasi baru yang masih 'belum_dikonfirm'
    const newRes = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-21',
        jam_mulai: '14:00',
        durasi_jam: 1,
      },
    });
    const newBody = await newRes.json();
    const unapprovedId = (newBody.data.reservasi || newBody.data).id;

    // Coba check-in
    const checkInRes = await request.post(`/api/admin/reservasi/${unapprovedId}/check-in`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(checkInRes.status()).toBe(400);

    const checkInBody = await checkInRes.json();
    assertErrorEnvelope(checkInBody, 400);
  });

  test('B49: POST /api/admin/reservasi/{id}/check-in setelah disetujui -> 200, status aktif', async ({ request }) => {
    // reservasiId sudah disetujui di B46
    const response = await request.post(`/api/admin/reservasi/${reservasiId}/check-in`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const resData = body.data.reservasi || body.data;
    expect(resData.status).toBe('aktif');
    expect(resData).toHaveProperty('check_in_time');
    expect(resData.check_in_time).not.toBeNull();
  });

  test('B50: POST /api/admin/reservasi/{id}/check-out setelah aktif -> 200, status selesai', async ({ request }) => {
    // reservasiId sudah aktif di B49
    const response = await request.post(`/api/admin/reservasi/${reservasiId}/check-out`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const resData = body.data.reservasi || body.data;
    expect(resData.status).toBe('selesai');
    expect(resData).toHaveProperty('check_out_time');
    expect(resData.check_out_time).not.toBeNull();
  });
});
