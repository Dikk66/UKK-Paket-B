import { test, expect } from '@playwright/test';
import { assertErrorEnvelope } from '../../fixtures/schema';
import {
  registerMaker,
  registerAdmin,
  registerMember,
  createSpace,
  createDiskon,
} from '../../fixtures/seed';

test.describe('Security: S5 & S6 - Multi-tenancy Data Isolation', () => {
  let makerX: any;
  let adminX: any;
  let memberX: any;
  let spaceX: any;
  let diskonX: any;

  let makerY: any;
  let adminY: any;
  let memberY: any;
  let spaceY: any;
  let diskonY: any;

  test.beforeAll(async ({ request }) => {
    // 1. Setup Maker X
    makerX = await registerMaker(request);
    adminX = await registerAdmin(request, makerX.app_key);
    memberX = await registerMember(request, makerX.app_key);
    spaceX = await createSpace(request, adminX.token, makerX.app_key, {
      nama_space: 'Space Exclusive Maker X',
    });
    diskonX = await createDiskon(request, adminX.token, makerX.app_key, {
      nama_diskon: 'PROMO_MAKER_X',
    });

    // 2. Setup Maker Y
    makerY = await registerMaker(request);
    adminY = await registerAdmin(request, makerY.app_key);
    memberY = await registerMember(request, makerY.app_key);
    spaceY = await createSpace(request, adminY.token, makerY.app_key, {
      nama_space: 'Space Exclusive Maker Y',
    });
    diskonY = await createDiskon(request, adminY.token, makerY.app_key, {
      nama_diskon: 'PROMO_MAKER_Y',
    });
  });

  test('S5: Query katalog & admin list Maker X tidak memunculkan data Maker Y', async ({ request }) => {
    // 1. Cek katalog space dengan x-maker-key Maker X
    const spacesRes = await request.get('/api/spaces', {
      headers: { 'x-maker-key': makerX.app_key },
    });
    expect(spacesRes.status()).toBe(200);
    const spacesBody = await spacesRes.json();
    const spaces = Array.isArray(spacesBody.data) ? spacesBody.data : spacesBody.data.spaces;
    const hasSpaceY = spaces.some((s: any) => s.id === spaceY.id || s.nama_space.includes('Maker Y'));
    expect(hasSpaceY, 'Data space milik Maker Y bocor ke katalog Maker X!').toBe(false);

    // 2. Cek diskon aktif dengan x-maker-key Maker X
    const diskonRes = await request.get('/api/diskon/active', {
      headers: { 'x-maker-key': makerX.app_key },
    });
    expect(diskonRes.status()).toBe(200);
    const diskonBody = await diskonRes.json();
    const diskons = Array.isArray(diskonBody.data) ? diskonBody.data : diskonBody.data.diskons;
    const hasDiskonY = diskons.some((d: any) => d.id === diskonY.id || d.nama_diskon === diskonY.nama_diskon);
    expect(hasDiskonY, 'Data diskon milik Maker Y bocor ke katalog Maker X!').toBe(false);

    // 3. Cek admin members list Maker X
    const membersRes = await request.get('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminX.token}`,
        'x-maker-key': makerX.app_key,
      },
    });
    expect(membersRes.status()).toBe(200);
    const membersBody = await membersRes.json();
    const members = Array.isArray(membersBody.data) ? membersBody.data : membersBody.data.members;
    const hasMemberY = members.some((m: any) => m.id === memberY.user.member?.id);
    expect(hasMemberY, 'Data member milik Maker Y bocor ke admin Maker X!').toBe(false);
  });

  test('S6: Akses resource ID milik Maker Y menggunakan header x-maker-key milik Maker X -> 403/404', async ({ request }) => {
    // 1. GET /api/spaces/{id_space_Y} dengan makerKey X
    const getSpaceRes = await request.get(`/api/spaces/${spaceY.id}`, {
      headers: { 'x-maker-key': makerX.app_key },
    });
    expect([403, 404]).toContain(getSpaceRes.status());
    const spaceBody = await getSpaceRes.json();
    assertErrorEnvelope(spaceBody, getSpaceRes.status());

    // 2. GET /api/admin/spaces/{id_space_Y} dengan token Admin X & makerKey X
    const getAdminSpaceRes = await request.get(`/api/admin/spaces/${spaceY.id}`, {
      headers: {
        Authorization: `Bearer ${adminX.token}`,
        'x-maker-key': makerX.app_key,
      },
    });
    expect([403, 404]).toContain(getAdminSpaceRes.status());

    // 3. GET /api/admin/members/{id_member_Y} dengan token Admin X & makerKey X
    const getMemberRes = await request.get(`/api/admin/members/${memberY.user.member?.id || memberY.user.id}`, {
      headers: {
        Authorization: `Bearer ${adminX.token}`,
        'x-maker-key': makerX.app_key,
      },
    });
    expect([403, 404]).toContain(getMemberRes.status());
  });
});
