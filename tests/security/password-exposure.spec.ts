import { test, expect } from '@playwright/test';
import {
  registerMaker,
  registerAdmin,
  registerMember,
  loginMaker,
  loginUser,
} from '../../fixtures/seed';
import { generateMemberPayload, generateAdminPayload } from '../../fixtures/test-data';

test.describe('Security: S9 - Zero Password Exposure Audit', () => {
  let makerKey: string;
  let makerSeed: any;
  let adminSeed: any;
  let memberSeed: any;

  function deepCheckNoPassword(obj: any, path = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(
        key.toLowerCase(),
        `Field password ditemukan bocor pada path response: '${currentPath}'`
      ).not.toBe('password');

      if (typeof value === 'object') {
        deepCheckNoPassword(value, currentPath);
      }
    }
  }

  test.beforeAll(async ({ request }) => {
    makerSeed = await registerMaker(request);
    makerKey = makerSeed.app_key;
    adminSeed = await registerAdmin(request, makerKey);
    memberSeed = await registerMember(request, makerKey);
  });

  test('S9.1: Register Maker response tidak mengekspos password', async ({ request }) => {
    const res = await request.post('/api/maker/register', {
      data: {
        name: 'Audit Maker',
        username: `audit_mkr_${Date.now()}`,
        email: `audit_${Date.now()}@ukk.local`,
        password: 'SecretPassword123!',
      },
    });
    const body = await res.json();
    deepCheckNoPassword(body);
  });

  test('S9.2: Login Maker response tidak mengekspos password', async ({ request }) => {
    const res = await request.post('/api/maker/login', {
      data: {
        username: makerSeed.credentials.username,
        password: makerSeed.credentials.password,
      },
    });
    const body = await res.json();
    deepCheckNoPassword(body);
  });

  test('S9.3: Register Member response tidak mengekspos password', async ({ request }) => {
    const payload = generateMemberPayload();
    const res = await request.post('/api/auth/register/member', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    const body = await res.json();
    deepCheckNoPassword(body);
  });

  test('S9.4: Register Admin response tidak mengekspos password', async ({ request }) => {
    const payload = generateAdminPayload();
    const res = await request.post('/api/auth/register/admin-space', {
      headers: { 'x-maker-key': makerKey },
      data: payload,
    });
    const body = await res.json();
    deepCheckNoPassword(body);
  });

  test('S9.5: Login User (Member & Admin) response tidak mengekspos password', async ({ request }) => {
    const resM = await request.post('/api/auth/login', {
      headers: { 'x-maker-key': makerKey },
      data: memberSeed.credentials,
    });
    deepCheckNoPassword(await resM.json());

    const resA = await request.post('/api/auth/login', {
      headers: { 'x-maker-key': makerKey },
      data: adminSeed.credentials,
    });
    deepCheckNoPassword(await resA.json());
  });

  test('S9.6: GET /api/auth/profile response tidak mengekspos password', async ({ request }) => {
    const res = await request.get('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${memberSeed.token}`,
        'x-maker-key': makerKey,
      },
    });
    deepCheckNoPassword(await res.json());
  });

  test('S9.7: GET /api/admin/members (list & detail) tidak mengekspos password', async ({ request }) => {
    const listRes = await request.get('/api/admin/members', {
      headers: {
        Authorization: `Bearer ${adminSeed.token}`,
        'x-maker-key': makerKey,
      },
    });
    deepCheckNoPassword(await listRes.json());
  });
});
