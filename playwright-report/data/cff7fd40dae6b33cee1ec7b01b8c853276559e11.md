# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/00-root-health.spec.ts >> 00 - Root & Health Endpoints >> B2: GET /health - Server healthy status ok
- Location: tests/api/00-root-health.spec.ts:14:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "ok"
Received: undefined
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { assertSuccessEnvelope } from '../../fixtures/schema';
  3  | 
  4  | test.describe('00 - Root & Health Endpoints', () => {
  5  |   test('B1: GET / - Status online', async ({ request }) => {
  6  |     const response = await request.get('/');
  7  |     expect(response.status()).toBe(200);
  8  | 
  9  |     const body = await response.json();
  10 |     assertSuccessEnvelope(body, 200);
  11 |     expect(body.data.status).toBe('online');
  12 |   });
  13 | 
  14 |   test('B2: GET /health - Server healthy status ok', async ({ request }) => {
  15 |     const response = await request.get('/health');
  16 |     expect(response.status()).toBe(200);
  17 | 
  18 |     const body = await response.json();
  19 |     assertSuccessEnvelope(body, 200);
> 20 |     expect(body.data.status).toBe('ok');
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  21 |   });
  22 | });
  23 | 
```