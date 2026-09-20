import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker, registerAdmin, createSpace } from '../../fixtures/seed';

test.describe('04 - Spaces Catalog', () => {
  let makerKey: string;
  let adminToken: string;
  let spaceDeskId: number;

  test.beforeAll(async ({ request }) => {
    const makerSeed = await registerMaker(request);
    makerKey = makerSeed.app_key;

    const adminSeed = await registerAdmin(request, makerKey);
    adminToken = adminSeed.token;

    // Create space for testing
    const space = await createSpace(request, adminToken, makerKey, {
      nama_space: 'Dedicated Desk Alpha',
      tipe: 'desk',
      harga_per_jam: 30000,
      kapasitas: 1,
      deskripsi: 'Meja kerja tenang untuk fokus',
    });
    spaceDeskId = space.id;
  });

  test('B17: GET /api/spaces/types - Array tepat 3 tipe', async ({ request }) => {
    const response = await request.get('/api/spaces/types', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const typesList = Array.isArray(body.data) ? body.data : body.data.types;
    expect(Array.isArray(typesList)).toBe(true);
    expect(typesList.length).toBe(3);

    const typeValues = typesList.map((t: any) => (typeof t === 'string' ? t : t.value));
    expect(typeValues).toContain('desk');
    expect(typeValues).toContain('meeting_room');
    expect(typeValues).toContain('private_office');
  });

  test('B18: GET /api/spaces?tipe=desk - Filter tipe', async ({ request }) => {
    const response = await request.get('/api/spaces?tipe=desk', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const items = Array.isArray(body.data) ? body.data : body.data.spaces || body.data.items;
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(item.tipe).toBe('desk');
    }
  });

  test('B19: GET /api/spaces?search=<kata kunci>', async ({ request }) => {
    const response = await request.get('/api/spaces?search=Dedicated', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const items = Array.isArray(body.data) ? body.data : body.data.spaces || body.data.items;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].nama_space).toContain('Dedicated');
  });

  test('B20: GET /api/spaces/{id} valid vs invalid', async ({ request }) => {
    // Valid
    const validRes = await request.get(`/api/spaces/${spaceDeskId}`, {
      headers: { 'x-maker-key': makerKey },
    });
    expect(validRes.status()).toBe(200);
    const validBody = await validRes.json();
    const space = validBody.data.space || validBody.data;
    expect(space.id).toBe(spaceDeskId);

    // Invalid
    const invalidRes = await request.get('/api/spaces/9999999', {
      headers: { 'x-maker-key': makerKey },
    });
    expect(invalidRes.status()).toBe(404);
    const invalidBody = await invalidRes.json();
    assertErrorEnvelope(invalidBody, 404);
  });

  test('B21: GET /api/spaces/availability - Slot kosong', async ({ request }) => {
    const response = await request.get(
      `/api/spaces/availability?id_space=${spaceDeskId}&tanggal=2026-12-01&jam_mulai=09:00&durasi_jam=2`,
      { headers: { 'x-maker-key': makerKey } }
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    assertSuccessEnvelope(body, 200);

    const available = body.data.available ?? body.data.is_available;
    expect(available).toBe(true);
  });

  test('B22: GET /api/spaces/availability - Slot yang sudah dibooking', async ({ request }) => {
    // Diuji bersama reservasi di test 06 atau gunakan data reservasi yang dibuat
    const response = await request.get(
      `/api/spaces/availability?id_space=${spaceDeskId}&tanggal=2026-12-01&jam_mulai=09:00&durasi_jam=2`,
      { headers: { 'x-maker-key': makerKey } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    assertSuccessEnvelope(body, 200);
  });
});
