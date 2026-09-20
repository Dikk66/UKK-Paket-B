import { expect } from '@playwright/test';

export function assertSuccessEnvelope(body: any, expectedStatusCode: number) {
  expect(body.status).toBe(true);
  expect(body.statusCode).toBe(expectedStatusCode);
  expect(typeof body.message).toBe('string');
  expect(body).toHaveProperty('data');
  expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
}

export function assertErrorEnvelope(body: any, expectedStatusCode: number) {
  expect(body.status).toBe(false);
  expect(body.statusCode).toBe(expectedStatusCode);
  expect(typeof body.message).toBe('string');
  expect(typeof body.error).toBe('string');
  expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
}
