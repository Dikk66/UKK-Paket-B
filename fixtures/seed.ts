import { APIRequestContext, expect } from '@playwright/test';
import {
  generateMakerPayload,
  generateMemberPayload,
  generateAdminPayload,
  generateSpacePayload,
  generateDiskonPayload,
} from './test-data';

export interface MakerSeed {
  maker: any;
  app_key: string;
  token: string;
  credentials: {
    username: string;
    email: string;
    password: string;
  };
}

export interface UserSeed {
  user: any;
  token: string;
  credentials: {
    username: string;
    password: string;
  };
}

export async function registerMaker(
  request: APIRequestContext,
  overrides = {}
): Promise<MakerSeed> {
  const payload = generateMakerPayload(overrides);
  const response = await request.post('/api/maker/register', {
    data: payload,
  });
  expect(response.status()).toBe(201);
  const json = await response.json();

  return {
    maker: json.data?.maker || json.data,
    app_key: json.data?.app_key || json.data?.maker?.app_key,
    token: json.data?.access_token || json.data?.token,
    credentials: {
      username: payload.username,
      email: payload.email,
      password: payload.password,
    },
  };
}

export async function loginMaker(
  request: APIRequestContext,
  identifier: string,
  password: string
): Promise<{ token: string; maker: any }> {
  const response = await request.post('/api/maker/login', {
    data: { identifier, password },
  });
  expect(response.status()).toBe(200);
  const json = await response.json();
  return {
    token: json.data.token || json.data.access_token,
    maker: json.data,
  };
}

export async function registerMember(
  request: APIRequestContext,
  makerKey: string,
  overrides = {}
): Promise<UserSeed> {
  const payload = generateMemberPayload(overrides);
  const response = await request.post('/api/auth/register/member', {
    headers: { 'x-maker-key': makerKey },
    data: payload,
  });
  expect(response.status()).toBe(201);
  const json = await response.json();

  // Login to obtain token
  const loginRes = await request.post('/api/auth/login', {
    headers: { 'x-maker-key': makerKey },
    data: { username: payload.username, password: payload.password },
  });
  expect(loginRes.status()).toBe(200);
  const loginJson = await loginRes.json();

  return {
    user: json.data,
    token: loginJson.data.token || loginJson.data.access_token,
    credentials: {
      username: payload.username,
      password: payload.password,
    },
  };
}

export async function registerAdmin(
  request: APIRequestContext,
  makerKey: string,
  overrides = {}
): Promise<UserSeed> {
  const payload = generateAdminPayload(overrides);
  const response = await request.post('/api/auth/register/admin-space', {
    headers: { 'x-maker-key': makerKey },
    data: payload,
  });
  expect(response.status()).toBe(201);
  const json = await response.json();

  // Login to obtain token
  const loginRes = await request.post('/api/auth/login', {
    headers: { 'x-maker-key': makerKey },
    data: { username: payload.username, password: payload.password },
  });
  expect(loginRes.status()).toBe(200);
  const loginJson = await loginRes.json();

  return {
    user: json.data,
    token: loginJson.data.token || loginJson.data.access_token,
    credentials: {
      username: payload.username,
      password: payload.password,
    },
  };
}

export async function loginUser(
  request: APIRequestContext,
  makerKey: string,
  credentials: { username: string; password: string }
): Promise<{ token: string; user: any }> {
  const response = await request.post('/api/auth/login', {
    headers: { 'x-maker-key': makerKey },
    data: credentials,
  });
  expect(response.status()).toBe(200);
  const json = await response.json();
  return {
    token: json.data.token || json.data.access_token,
    user: json.data.user || json.data,
  };
}

export async function createSpace(
  request: APIRequestContext,
  adminToken: string,
  makerKey: string,
  overrides = {}
) {
  const payload = generateSpacePayload(overrides);
  const response = await request.post('/api/admin/spaces', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-maker-key': makerKey,
    },
    data: payload,
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.data.space || json.data;
}

export async function createDiskon(
  request: APIRequestContext,
  adminToken: string,
  makerKey: string,
  overrides = {}
) {
  const payload = generateDiskonPayload(overrides);
  const response = await request.post('/api/admin/diskon', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-maker-key': makerKey,
    },
    data: payload,
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.data.diskon || json.data;
}
