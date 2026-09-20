# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security/injection-and-payload-fuzzing.spec.ts >> Security: S7, S8, S10, S11 - Injection, Fuzzing & Rate Limit >> S10: Payload Data Type Fuzzing menghasilkan 400 terkontrol, bukan 500
- Location: tests/security/injection-and-payload-fuzzing.spec.ts:64:7

# Error details

```
Error: Payload fuzzing {"harga_per_jam":"string_bukan_angka","kapasitas":2,"nama_space":"Test Fuzz 1","tipe":"desk"} seharusnya merespons 400, bukan 500

expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 500
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { registerMaker, registerAdmin } from '../../fixtures/seed';
  3   | 
  4   | test.describe('Security: S7, S8, S10, S11 - Injection, Fuzzing & Rate Limit', () => {
  5   |   let makerKey: string;
  6   |   let adminToken: string;
  7   | 
  8   |   test.beforeAll(async ({ request }) => {
  9   |     const maker = await registerMaker(request);
  10  |     makerKey = maker.app_key;
  11  |     const admin = await registerAdmin(request, makerKey);
  12  |     adminToken = admin.token;
  13  |   });
  14  | 
  15  |   test('S7: SQL Injection Payloads tidak menyebabkan bypass auth atau error 500 leak', async ({ request }) => {
  16  |     const sqliPayloads = [
  17  |       "' OR '1'='1",
  18  |       "' OR 1=1 --",
  19  |       "admin' --",
  20  |       "1; DROP TABLE users;--",
  21  |     ];
  22  | 
  23  |     for (const payload of sqliPayloads) {
  24  |       // 1. Auth bypass attempt
  25  |       const loginRes = await request.post('/api/auth/login', {
  26  |         headers: { 'x-maker-key': makerKey },
  27  |         data: { username: payload, password: 'password' },
  28  |       });
  29  |       // Pastikan ditolak 400 atau 401, BUKAN 200 (bypass) dan BUKAN 500 (crash)
  30  |       expect([400, 401]).toContain(loginRes.status());
  31  | 
  32  |       // 2. Search query SQLi
  33  |       const searchRes = await request.get(`/api/spaces?search=${encodeURIComponent(payload)}`, {
  34  |         headers: { 'x-maker-key': makerKey },
  35  |       });
  36  |       expect(searchRes.status()).toBe(200); // Harus ditangani secara aman oleh Prisma ORM
  37  |     }
  38  |   });
  39  | 
  40  |   test('S8: XSS Script tags disimpan sebagai string tanpa merusak response', async ({ request }) => {
  41  |     const xssPayload = '<script>alert("XSS_PWNED")</script>';
  42  | 
  43  |     const spaceRes = await request.post('/api/admin/spaces', {
  44  |       headers: {
  45  |         Authorization: `Bearer ${adminToken}`,
  46  |         'x-maker-key': makerKey,
  47  |       },
  48  |       data: {
  49  |         nama_space: `XSS Space ${Date.now()}`,
  50  |         tipe: 'desk',
  51  |         harga_per_jam: 30000,
  52  |         kapasitas: 2,
  53  |         deskripsi: xssPayload,
  54  |       },
  55  |     });
  56  |     expect(spaceRes.status()).toBe(201);
  57  |     const body = await spaceRes.json();
  58  |     const createdSpace = body.data.space || body.data;
  59  | 
  60  |     // Pastikan tersimpan dan dikembalikan sebagai teks string utuh tanpa dieksekusi / merusak JSON
  61  |     expect(createdSpace.deskripsi).toBe(xssPayload);
  62  |   });
  63  | 
  64  |   test('S10: Payload Data Type Fuzzing menghasilkan 400 terkontrol, bukan 500', async ({ request }) => {
  65  |     const invalidTypes = [
  66  |       { harga_per_jam: 'string_bukan_angka', kapasitas: 2, nama_space: 'Test Fuzz 1', tipe: 'desk' },
  67  |       { harga_per_jam: [10000, 20000], kapasitas: 'dua', nama_space: 'Test Fuzz 2', tipe: 'desk' },
  68  |       { harga_per_jam: { amount: 50000 }, kapasitas: null, nama_space: 'Test Fuzz 3', tipe: 'desk' },
  69  |     ];
  70  | 
  71  |     for (const payload of invalidTypes) {
  72  |       const res = await request.post('/api/admin/spaces', {
  73  |         headers: {
  74  |           Authorization: `Bearer ${adminToken}`,
  75  |           'x-maker-key': makerKey,
  76  |         },
  77  |         data: payload,
  78  |       });
  79  | 
  80  |       // Server harus merespons 400 Bad Request, bukan 500 unhandled exception
  81  |       expect(
  82  |         res.status(),
  83  |         `Payload fuzzing ${JSON.stringify(payload)} seharusnya merespons 400, bukan ${res.status()}`
> 84  |       ).toBe(400);
      |         ^ Error: Payload fuzzing {"harga_per_jam":"string_bukan_angka","kapasitas":2,"nama_space":"Test Fuzz 1","tipe":"desk"} seharusnya merespons 400, bukan 500
  85  |     }
  86  |   });
  87  | 
  88  |   test('S11: Brute-force & Throttling evaluation on repeated failed logins', async ({ request }) => {
  89  |     const attempts = 10;
  90  |     const statuses: number[] = [];
  91  | 
  92  |     for (let i = 0; i < attempts; i++) {
  93  |       const res = await request.post('/api/auth/login', {
  94  |         headers: { 'x-maker-key': makerKey },
  95  |         data: { username: 'victim_user', password: `WrongPass${i}!` },
  96  |       });
  97  |       statuses.push(res.status());
  98  |     }
  99  | 
  100 |     // Evaluasi apakah ada status 429 Too Many Requests
  101 |     const hasRateLimit = statuses.includes(429);
  102 |     // Catatan: Jika tidak ada rate limit, catat sebagai rekomendasi finding
  103 |     expect(statuses.every(s => s === 401 || s === 429)).toBe(true);
  104 |   });
  105 | });
  106 | 
```