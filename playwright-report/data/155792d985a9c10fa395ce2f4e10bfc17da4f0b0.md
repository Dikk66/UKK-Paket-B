# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/01-maker.spec.ts >> 01 - Multi-tenancy (App Maker) >> B4: Register App Maker - Email/Username duplikat
- Location: tests/api/01-maker.spec.ts:23:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 409
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
  3  | import { generateMakerPayload } from '../../fixtures/test-data';
  4  | import { registerMaker } from '../../fixtures/seed';
  5  | 
  6  | test.describe('01 - Multi-tenancy (App Maker)', () => {
  7  |   test('B3: Register App Maker - Sukses', async ({ request }) => {
  8  |     const payload = generateMakerPayload();
  9  |     const response = await request.post('/api/maker/register', { data: payload });
  10 |     expect(response.status()).toBe(201);
  11 | 
  12 |     const body = await response.json();
  13 |     assertSuccessEnvelope(body, 201);
  14 | 
  15 |     // Assert contract: data.app_key match ^mk_[a-f0-9]+$ dan token ada
  16 |     const appKey = body.data.app_key || body.data.maker?.app_key;
  17 |     const token = body.data.access_token || body.data.token;
  18 | 
  19 |     expect(appKey).toMatch(/^mk_[a-f0-9]+$/);
  20 |     expect(token).toBeTruthy();
  21 |   });
  22 | 
  23 |   test('B4: Register App Maker - Email/Username duplikat', async ({ request }) => {
  24 |     const payload = generateMakerPayload();
  25 |     const res1 = await request.post('/api/maker/register', { data: payload });
  26 |     expect(res1.status()).toBe(201);
  27 | 
  28 |     const res2 = await request.post('/api/maker/register', { data: payload });
  29 |     // Kontrak: 400 Bad Request
> 30 |     expect(res2.status()).toBe(400);
     |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  31 | 
  32 |     const body = await res2.json();
  33 |     assertErrorEnvelope(body, 400);
  34 |     expect(body.error).toBe('Bad Request');
  35 |   });
  36 | 
  37 |   test('B5: Login App Maker - Sukses & Gagal', async ({ request }) => {
  38 |     const seed = await registerMaker(request);
  39 | 
  40 |     // Sukses
  41 |     const successRes = await request.post('/api/maker/login', {
  42 |       data: {
  43 |         username: seed.credentials.username,
  44 |         password: seed.credentials.password,
  45 |       },
  46 |     });
  47 |     expect(successRes.status()).toBe(200);
  48 |     const successBody = await successRes.json();
  49 |     assertSuccessEnvelope(successBody, 200);
  50 |     expect(successBody.data.token || successBody.data.access_token).toBeTruthy();
  51 | 
  52 |     // Gagal: password salah
  53 |     const failRes = await request.post('/api/maker/login', {
  54 |       data: {
  55 |         username: seed.credentials.username,
  56 |         password: 'WrongPassword123!',
  57 |       },
  58 |     });
  59 |     expect(failRes.status()).toBe(401);
  60 |     const failBody = await failRes.json();
  61 |     assertErrorEnvelope(failBody, 401);
  62 |   });
  63 | 
  64 |   test('B6: GET /api/maker/me tanpa token', async ({ request }) => {
  65 |     const response = await request.get('/api/maker/me');
  66 |     expect(response.status()).toBe(401);
  67 |     const body = await response.json();
  68 |     assertErrorEnvelope(body, 401);
  69 |   });
  70 | 
  71 |   test('B7: GET /api/maker/stats dengan x-maker-key valid', async ({ request }) => {
  72 |     const seed = await registerMaker(request);
  73 |     const response = await request.get('/api/maker/stats', {
  74 |       headers: { 'x-maker-key': seed.app_key },
  75 |     });
  76 |     expect(response.status()).toBe(200);
  77 | 
  78 |     const body = await response.json();
  79 |     assertSuccessEnvelope(body, 200);
  80 | 
  81 |     const stats = body.data.stats || body.data;
  82 |     // Cek semua count adalah number >= 0
  83 |     expect(typeof stats.total_users).toBe('number');
  84 |     expect(stats.total_users).toBeGreaterThanOrEqual(0);
  85 | 
  86 |     expect(typeof stats.total_spaces).toBe('number');
  87 |     expect(stats.total_spaces).toBeGreaterThanOrEqual(0);
  88 | 
  89 |     expect(typeof stats.total_diskons).toBe('number');
  90 |     expect(stats.total_diskons).toBeGreaterThanOrEqual(0);
  91 | 
  92 |     expect(typeof stats.total_reservasi).toBe('number');
  93 |     expect(stats.total_reservasi).toBeGreaterThanOrEqual(0);
  94 |   });
  95 | });
  96 | 
```