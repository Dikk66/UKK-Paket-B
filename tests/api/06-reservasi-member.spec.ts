import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import {
  registerMaker,
  registerAdmin,
  registerMember,
  createSpace,
  createDiskon,
} from '../../fixtures/seed';

test.describe('06 - Reservasi Member', () => {
  let makerKey: string;
  let adminToken: string;
  let memberA: any;
  let memberB: any;
  let spaceId: number;
  const hargaPerJam = 50000;
  let diskonId: number;
  let diskonCode: string;
  const diskonPersen = 20;

  test.beforeAll(async ({ request }) => {
    const makerSeed = await registerMaker(request);
    makerKey = makerSeed.app_key;

    const adminSeed = await registerAdmin(request, makerKey);
    adminToken = adminSeed.token;

    memberA = await registerMember(request, makerKey);
    memberB = await registerMember(request, makerKey);

    const space = await createSpace(request, adminToken, makerKey, {
      harga_per_jam: hargaPerJam,
      nama_space: 'Space Reservasi Test',
    });
    spaceId = space.id;

    const diskon = await createDiskon(request, adminToken, makerKey, {
      persentase_diskon: diskonPersen,
    });
    diskonId = diskon.id;
    diskonCode = diskon.nama_diskon;
  });

  test('B25: Buat reservasi tanpa login -> 401', async ({ request }) => {
    const response = await request.post('/api/reservasi', {
      headers: { 'x-maker-key': makerKey },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-10',
        jam_mulai: '10:00',
        durasi_jam: 2,
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    assertErrorEnvelope(body, 401);
  });

  test('B26: Buat reservasi valid tanpa promo (kalkulasi harga)', async ({ request }) => {
    const durasi = 3;
    const response = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-10',
        jam_mulai: '08:00',
        durasi_jam: durasi,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    const resData = body.data.reservasi || body.data;
    const detail = resData.detail_reservasi?.[0];
    const expectedTotal = hargaPerJam * durasi;

    if (detail) {
      expect(detail.total_harga).toBe(expectedTotal);
    }
  });

  test('B27: Buat reservasi dengan diskon/promo valid', async ({ request }) => {
    const durasi = 2;
    const response = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-10',
        jam_mulai: '14:00',
        durasi_jam: durasi,
        id_diskon: diskonId,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    assertSuccessEnvelope(body, 201);

    const resData = body.data.reservasi || body.data;
    const detail = resData.detail_reservasi?.[0];
    const totalAwal = hargaPerJam * durasi;
    const potongan = (totalAwal * diskonPersen) / 100;
    const expectedTotalBayar = totalAwal - potongan;

    if (detail) {
      expect(detail.total_harga).toBe(expectedTotalBayar);
    }
  });

  test('B28: Buat reservasi slot bentrok (overlap id_space + tanggal + jam)', async ({ request }) => {
    // 14:00 - 16:00 sudah dipesan di B27
    const response = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberB.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-10',
        jam_mulai: '15:00',
        durasi_jam: 2, // 15:00 - 17:00 -> bentrok dengan 14:00 - 16:00
      },
    });
    expect([400, 409]).toContain(response.status());
    const body = await response.json();
    assertErrorEnvelope(body, response.status());
  });

  test('B29: Buat reservasi durasi_jam < 1 atau bukan integer', async ({ request }) => {
    const resNegative = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-11',
        jam_mulai: '09:00',
        durasi_jam: 0,
      },
    });
    expect(resNegative.status()).toBe(400);

    const resFloat = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-11',
        jam_mulai: '09:00',
        durasi_jam: 1.5,
      },
    });
    expect(resFloat.status()).toBe(400);
  });

  test('B30: jam_selesai terhitung otomatis dengan benar', async ({ request }) => {
    const response = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-12',
        jam_mulai: '09:30',
        durasi_jam: 3,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    const resData = body.data.reservasi || body.data;
    expect(resData.jam_selesai).toBe('12:30');
  });

  test('B31: GET /api/reservasi/my hanya menampilkan reservasi milik member login', async ({ request }) => {
    const response = await request.get('/api/reservasi/my', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const list = Array.isArray(body.data) ? body.data : body.data.reservasis || [];
    for (const r of list) {
      if (r.id_member) {
        expect(r.id_member).toBe(memberA.user.member?.id || memberA.user.id);
      }
    }
  });

  test('B32: GET /api/reservasi/my/history?month=&year=', async ({ request }) => {
    const response = await request.get('/api/reservasi/my/history?month=11&year=2026', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const summary = body.data.summary || body.data;
    expect(summary).toBeDefined();
    expect(typeof (summary.total_reservasi ?? summary.total)).toBe('number');
  });

  test('B33: GET /api/reservasi/{id}/e-ticket', async ({ request }) => {
    // Buat satu reservasi untuk tiket
    const createRes = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-15',
        jam_mulai: '13:00',
        durasi_jam: 2,
      },
    });
    const createBody = await createRes.json();
    const reservasiId = (createBody.data.reservasi || createBody.data).id;

    const response = await request.get(`/api/reservasi/${reservasiId}/e-ticket`, {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const ticket = body.data.e_ticket || body.data;
    expect(ticket).toHaveProperty('qr_code_payload');
    expect(ticket.qr_code_payload).toContain(String(reservasiId));
    expect(ticket).toHaveProperty('kode_booking');
  });

  test('B34: PATCH /api/reservasi/{id}/cancel - Sukses lalu cancel lagi', async ({ request }) => {
    // Buat reservasi untuk dibatalkan
    const createRes = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-16',
        jam_mulai: '10:00',
        durasi_jam: 1,
      },
    });
    const createBody = await createRes.json();
    const reservasiId = (createBody.data.reservasi || createBody.data).id;

    // Pembatalan pertama: Sukses (200)
    const cancelRes1 = await request.patch(`/api/reservasi/${reservasiId}/cancel`, {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(cancelRes1.status()).toBe(200);
    const body1 = await cancelRes1.json();
    assertSuccessEnvelope(body1, 200);
    const updated = body1.data.reservasi || body1.data;
    expect(updated.status).toBe('dibatalkan');

    // Pembatalan kedua: Gagal (400)
    const cancelRes2 = await request.patch(`/api/reservasi/${reservasiId}/cancel`, {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect(cancelRes2.status()).toBe(400);
    const body2 = await cancelRes2.json();
    assertErrorEnvelope(body2, 400);
  });

  test('B35: Member A akses GET /api/reservasi/{id} milik Member B -> 403/404', async ({ request }) => {
    // Member B buat reservasi
    const resB = await request.post('/api/reservasi', {
      headers: {
        Authorization: `Bearer ${memberB.token}`,
        'x-maker-key': makerKey,
      },
      data: {
        id_space: spaceId,
        tanggal_reservasi: '2026-11-17',
        jam_mulai: '08:00',
        durasi_jam: 2,
      },
    });
    const bodyB = await resB.json();
    const reservasiBId = (bodyB.data.reservasi || bodyB.data).id;

    // Member A mencoba akses
    const accessRes = await request.get(`/api/reservasi/${reservasiBId}`, {
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-maker-key': makerKey,
      },
    });
    expect([403, 404]).toContain(accessRes.status());
    const accessBody = await accessRes.json();
    assertErrorEnvelope(accessBody, accessRes.status());
  });
});
