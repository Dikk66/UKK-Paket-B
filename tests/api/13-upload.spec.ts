import { test, expect } from '@playwright/test';
import { assertSuccessEnvelope, assertErrorEnvelope } from '../../fixtures/schema';
import { registerMaker } from '../../fixtures/seed';

test.describe('13 - Upload Endpoints', () => {
  let makerKey: string;

  test.beforeAll(async ({ request }) => {
    const maker = await registerMaker(request);
    makerKey = maker.app_key;
  });

  // Minimal 1x1 pixel transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  test('B54: Upload file gambar valid (.png) ke endpoint upload', async ({ request }) => {
    // 1. /api/upload/image (field: 'image')
    const resImage = await request.post('/api/upload/image', {
      headers: { 'x-maker-key': makerKey },
      multipart: {
        image: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: samplePngBuffer,
        },
      },
    });
    expect([200, 201]).toContain(resImage.status());
    const bodyImage = await resImage.json();
    assertSuccessEnvelope(bodyImage, resImage.status());
    expect(bodyImage.data).toHaveProperty('url');

    // 2. /api/upload/spaces (field: 'foto')
    const resSpaces = await request.post('/api/upload/spaces', {
      headers: { 'x-maker-key': makerKey },
      multipart: {
        foto: {
          name: 'test-space.png',
          mimeType: 'image/png',
          buffer: samplePngBuffer,
        },
      },
    });
    expect([200, 201]).toContain(resSpaces.status());
    const bodySpaces = await resSpaces.json();
    assertSuccessEnvelope(bodySpaces, resSpaces.status());
    expect(bodySpaces.data).toHaveProperty('url');

    // 3. /api/upload/members (field: 'foto')
    const resMembers = await request.post('/api/upload/members', {
      headers: { 'x-maker-key': makerKey },
      multipart: {
        foto: {
          name: 'test-member.png',
          mimeType: 'image/png',
          buffer: samplePngBuffer,
        },
      },
    });
    expect([200, 201]).toContain(resMembers.status());
    const bodyMembers = await resMembers.json();
    assertSuccessEnvelope(bodyMembers, resMembers.status());
    expect(bodyMembers.data).toHaveProperty('url');

    // Verifikasi file yang diupload dapat diakses
    const fileRes = await request.get(bodyImage.data.url);
    expect(fileRes.status()).toBe(200);
  });

  test('B55: Upload file bukan gambar (.txt)', async ({ request }) => {
    const textBuffer = Buffer.from('Ini bukan file gambar, melainkan plain text.');

    const response = await request.post('/api/upload/image', {
      headers: { 'x-maker-key': makerKey },
      multipart: {
        image: {
          name: 'payload.txt',
          mimeType: 'text/plain',
          buffer: textBuffer,
        },
      },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });

  test('B56: Upload tanpa file (field kosong)', async ({ request }) => {
    const response = await request.post('/api/upload/image', {
      headers: { 'x-maker-key': makerKey },
      multipart: {},
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    assertErrorEnvelope(body, 400);
  });
});
