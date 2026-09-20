# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/02-auth-member.spec.ts >> 02 - Auth Member >> B11: Register member - Username duplikat
- Location: tests/api/02-auth-member.spec.ts:73:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 409
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
  3   | import { generateMemberPayload } from '../../fixtures/test-data';
  4   | import { registerMaker } from '../../fixtures/seed';
  5   | 
  6   | test.describe('02 - Auth Member', () => {
  7   |   let makerKey: string;
  8   | 
  9   |   test.beforeAll(async ({ request }) => {
  10  |     const seed = await registerMaker(request);
  11  |     makerKey = seed.app_key;
  12  |   });
  13  | 
  14  |   test('B8: Register member - Semua field wajib valid', async ({ request }) => {
  15  |     const payload = generateMemberPayload();
  16  |     const response = await request.post('/api/auth/register/member', {
  17  |       headers: { 'x-maker-key': makerKey },
  18  |       data: payload,
  19  |     });
  20  |     expect(response.status()).toBe(201);
  21  | 
  22  |     const body = await response.json();
  23  |     assertSuccessEnvelope(body, 201);
  24  | 
  25  |     // Response TIDAK boleh mengandung password mentah
  26  |     expect(body.data).not.toHaveProperty('password');
  27  |     if (body.data.user) {
  28  |       expect(body.data.user).not.toHaveProperty('password');
  29  |     }
  30  |   });
  31  | 
  32  |   test('B9: Register member - Field wajib kosong', async ({ request }) => {
  33  |     const requiredFields = [
  34  |       'username',
  35  |       'password',
  36  |       'nama_member',
  37  |       'instansi',
  38  |       'alamat',
  39  |       'telp',
  40  |     ];
  41  | 
  42  |     for (const field of requiredFields) {
  43  |       const payload = generateMemberPayload();
  44  |       delete payload[field as keyof typeof payload];
  45  | 
  46  |       const response = await request.post('/api/auth/register/member', {
  47  |         headers: { 'x-maker-key': makerKey },
  48  |         data: payload,
  49  |       });
  50  | 
  51  |       expect(
  52  |         response.status(),
  53  |         `Field '${field}' yang kosong seharusnya mengembalikan status 400`
  54  |       ).toBe(400);
  55  | 
  56  |       const body = await response.json();
  57  |       assertErrorEnvelope(body, 400);
  58  |     }
  59  |   });
  60  | 
  61  |   test('B10: Register member - Password < 6 karakter', async ({ request }) => {
  62  |     const payload = generateMemberPayload({ password: '123' });
  63  |     const response = await request.post('/api/auth/register/member', {
  64  |       headers: { 'x-maker-key': makerKey },
  65  |       data: payload,
  66  |     });
  67  |     expect(response.status()).toBe(400);
  68  | 
  69  |     const body = await response.json();
  70  |     assertErrorEnvelope(body, 400);
  71  |   });
  72  | 
  73  |   test('B11: Register member - Username duplikat', async ({ request }) => {
  74  |     const payload = generateMemberPayload();
  75  |     const res1 = await request.post('/api/auth/register/member', {
  76  |       headers: { 'x-maker-key': makerKey },
  77  |       data: payload,
  78  |     });
  79  |     expect(res1.status()).toBe(201);
  80  | 
  81  |     const res2 = await request.post('/api/auth/register/member', {
  82  |       headers: { 'x-maker-key': makerKey },
  83  |       data: payload,
  84  |     });
> 85  |     expect(res2.status()).toBe(400);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  86  | 
  87  |     const body = await res2.json();
  88  |     assertErrorEnvelope(body, 400);
  89  |   });
  90  | 
  91  |   test('B12: Register member TANPA header x-maker-key', async ({ request }) => {
  92  |     const payload = generateMemberPayload();
  93  |     const response = await request.post('/api/auth/register/member', {
  94  |       data: payload,
  95  |     });
  96  | 
  97  |     // Harus ditolak 400 atau 401
  98  |     expect([400, 401]).toContain(response.status());
  99  |     const body = await response.json();
  100 |     assertErrorEnvelope(body, response.status());
  101 |   });
  102 | });
  103 | 
```