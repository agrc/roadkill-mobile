import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  appleVerifyIdToken,
  appleValidateRefreshToken,
  appleGetTokens,
  cacheAppleTokensMock,
  getCachedAppleRefreshTokenMock,
  kyMock,
  deleteCachedUserMock,
  getCachedUserMock,
  setCachedUserMock,
  getAppUserMock,
} = vi.hoisted(() => ({
  appleVerifyIdToken: vi.fn(),
  appleValidateRefreshToken: vi.fn(),
  appleGetTokens: vi.fn(),
  cacheAppleTokensMock: vi.fn(),
  getCachedAppleRefreshTokenMock: vi.fn(),
  kyMock: vi.fn(),
  deleteCachedUserMock: vi.fn(),
  getCachedUserMock: vi.fn(),
  setCachedUserMock: vi.fn(),
  getAppUserMock: vi.fn(),
}));

vi.mock('ky', () => ({ default: kyMock }));
vi.mock('../services/apple_sign_in.js', () => ({
  default: {
    verifyIdToken: appleVerifyIdToken,
    validateRefreshToken: appleValidateRefreshToken,
    getTokens: appleGetTokens,
  },
}));
vi.mock('../services/secrets.js', () => ({ default: vi.fn() }));
vi.mock('../services/user_cache.js', () => ({
  cacheAppleTokens: cacheAppleTokensMock,
  deleteCachedUser: deleteCachedUserMock,
  getCachedAppleRefreshToken: getCachedAppleRefreshTokenMock,
  getCachedUser: getCachedUserMock,
  setCachedUser: setCachedUserMock,
  shouldCacheUser: (provider) => ['apple', 'utahid'].includes(provider),
}));
vi.mock('../services/user_management.js', () => ({ getUser: getAppUserMock }));

import {
  authenticate,
  logout,
  requireRegisteredUser,
  verifyAppleTokenAndCode,
} from './security.js';

function userInfoResponse(body, status = 200) {
  return {
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function createResponse() {
  const response = { locals: {} };
  response.status = vi.fn((status) => {
    response.statusCode = status;
    return response;
  });
  response.json = vi.fn((body) => {
    response.body = body;
    return response;
  });
  response.send = vi.fn((body) => {
    response.body = body;
    return response;
  });
  return response;
}

function encodeJwtPayload(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCachedUserMock.mockResolvedValue(undefined);
    cacheAppleTokensMock.mockResolvedValue(undefined);
    getCachedAppleRefreshTokenMock.mockResolvedValue(null);
    getCachedUserMock.mockResolvedValue(null);
    setCachedUserMock.mockResolvedValue(undefined);
    appleGetTokens.mockResolvedValue({
      identityToken: 'fresh-id-token',
      refreshToken: 'refresh-token',
    });
    getAppUserMock.mockResolvedValue({ id: 'database-user' });
    kyMock.mockResolvedValue(userInfoResponse({ sub: 'provider-subject' }));
    appleVerifyIdToken.mockResolvedValue('provider-subject');
    appleValidateRefreshToken.mockResolvedValue('refreshed-id-token');
  });

  it.each(['google', 'utahid', 'apple'])(
    'accepts a verified registered %s identity',
    async (provider) => {
      const response = createResponse();
      const next = vi.fn();
      const requestMock = {
        body: {},
        headers: { authorization: `${provider}:Bearer provider-token` },
      };

      await authenticate(requestMock, response, next);

      expect(response.locals).toMatchObject({
        authId: 'provider-subject',
        authProvider: provider,
        userId: 'database-user',
      });
      expect(next).toHaveBeenCalledOnce();
      expect(getAppUserMock).toHaveBeenCalledWith('provider-subject', provider);
      if (provider === 'utahid' || provider === 'apple') {
        expect(setCachedUserMock).toHaveBeenCalledWith(
          'provider-token',
          provider,
          'database-user',
        );
      }
    },
  );

  it('allows an authenticated identity without an app-user mapping for onboarding', async () => {
    getAppUserMock.mockResolvedValue(undefined);
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      {
        body: {},
        headers: { authorization: 'google:Bearer provider-token' },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.locals).toMatchObject({
      authId: 'provider-subject',
      authProvider: 'google',
    });
    expect(response.locals.userId).toBeUndefined();
  });

  it('returns structured 403 and blocks downstream upload work without a mapping', async () => {
    getAppUserMock.mockResolvedValue(undefined);
    const upload = vi.fn((request, response, next) => next());
    const protectedHandler = vi.fn((request, response) => response.send('ok'));
    const app = express();
    app.post(
      '/report',
      authenticate,
      requireRegisteredUser,
      upload,
      protectedHandler,
    );

    const result = await request(app)
      .post('/report')
      .set('Authorization', 'google:Bearer provider-token')
      .attach('photo', Buffer.from('photo'), 'photo.jpg');

    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      error: 'registration_required',
      error_description:
        'Register this identity before accessing this resource',
    });
    expect(upload).not.toHaveBeenCalled();
    expect(protectedHandler).not.toHaveBeenCalled();
  });

  it('does not authorize a cached user id after its provider mapping is deleted', async () => {
    const token = encodeJwtPayload({ sub: 'cached-subject', exp: 2000000000 });
    getCachedUserMock.mockResolvedValue({ userId: 'deleted-database-user' });
    getAppUserMock.mockResolvedValue(undefined);
    const response = createResponse();
    const authNext = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: `utahid:Bearer ${token}` } },
      response,
      authNext,
    );
    const protectedNext = vi.fn();
    await requireRegisteredUser({}, response, protectedNext);

    expect(response.locals.authId).toBe('cached-subject');
    expect(response.locals.userId).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(protectedNext).not.toHaveBeenCalled();
  });

  it('rejects an expired Apple token after its expired cache entry misses', async () => {
    const token = encodeJwtPayload({ sub: 'provider-subject', exp: 1 });
    appleVerifyIdToken.mockRejectedValueOnce(
      Object.assign(new Error('Apple identity token expired'), {
        name: 'TokenExpiredError',
      }),
    );
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: `apple:Bearer ${token}` } },
      response,
      next,
    );

    expect(getCachedUserMock).toHaveBeenCalledWith(token, 'apple');
    expect(response.status).toHaveBeenCalledWith(401);
    expect(getAppUserMock).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['null', 'undefined', ''])('rejects an empty token value: %s', async (token) => {
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: `google:Bearer ${token}` } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body.error).toBe('invalid_token');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects unsupported providers before constructing a provider request', async () => {
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: 'unknown:Bearer token' } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body.error).toBe('invalid_token');
    expect(kyMock).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('maps provider credential rejection to structured 401', async () => {
    kyMock.mockResolvedValue(
      userInfoResponse({ error: 'invalid_token' }, 401),
    );
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: 'google:Bearer expired-token' } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body).toEqual({
      error: 'invalid_token',
      error_description: 'invalid_token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed', 'JsonWebTokenError'],
    ['expired', 'TokenExpiredError'],
    ['unknown signing key', 'SigningKeyNotFoundError'],
  ])('maps %s Apple credentials to structured 401', async (_, errorName) => {
    appleVerifyIdToken.mockRejectedValue(
      Object.assign(new Error('invalid Apple token'), { name: errorName }),
    );
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: 'apple:Bearer invalid-token' } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body.error).toBe('invalid_token');
    expect(next).not.toHaveBeenCalled();
  });

  it('caches only a refreshed Apple token for the same verified subject', async () => {
    const response = createResponse();

    await verifyAppleTokenAndCode(
      { body: { authorizationCode: 'authorization-code', identityToken: 'old-id-token' } },
      response,
    );

    expect(cacheAppleTokensMock).toHaveBeenCalledWith(
      'provider-subject',
      'fresh-id-token',
      'refresh-token',
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.body).toEqual({ identityToken: 'fresh-id-token' });
  });

  it('returns the verified input token when Apple returns no replacement token', async () => {
    appleGetTokens.mockResolvedValueOnce({ refreshToken: 'refresh-token' });
    const response = createResponse();

    await verifyAppleTokenAndCode(
      { body: { authorizationCode: 'authorization-code', identityToken: 'old-id-token' } },
      response,
    );

    expect(appleVerifyIdToken).toHaveBeenCalledWith('old-id-token');
    expect(cacheAppleTokensMock).toHaveBeenCalledWith(
      'provider-subject',
      'old-id-token',
      'refresh-token',
    );
    expect(response.body).toEqual({ identityToken: 'old-id-token' });
  });

  it('recovers from a revoked cached Apple refresh token using an authorization code', async () => {
    getCachedAppleRefreshTokenMock.mockResolvedValueOnce('revoked-refresh-token');
    appleValidateRefreshToken.mockRejectedValueOnce(
      Object.assign(new Error('invalid_grant: refresh token revoked'), {
        code: 'invalid_grant',
      }),
    );
    const response = createResponse();

    await verifyAppleTokenAndCode(
      { body: { authorizationCode: 'authorization-code', identityToken: 'old-id-token' } },
      response,
    );

    expect(appleGetTokens).toHaveBeenCalledWith('authorization-code');
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('rejects an Apple refresh that resolves to a different subject', async () => {
    appleVerifyIdToken
      .mockResolvedValueOnce('provider-subject')
      .mockResolvedValueOnce('different-subject');
    const response = createResponse();

    await verifyAppleTokenAndCode(
      { body: { authorizationCode: 'authorization-code', identityToken: 'old-id-token' } },
      response,
    );

    expect(cacheAppleTokensMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body.error).toBe('invalid_token');
  });

  it('keeps provider outages in the 5xx path', async () => {
    appleVerifyIdToken.mockRejectedValue(new Error('provider unavailable'));
    const response = createResponse();
    const next = vi.fn();

    await authenticate(
      { body: {}, headers: { authorization: 'apple:Bearer provider-token' } },
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.body.error).toBe('server_error');
    expect(next).not.toHaveBeenCalled();
  });

  it('deletes the provider-scoped cache entry on logout', async () => {
    const response = createResponse();

    await logout(
      { headers: { authorization: 'utahid:Bearer provider-token' } },
      response,
    );

    expect(deleteCachedUserMock).toHaveBeenCalledWith(
      'provider-token',
      'utahid',
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns a structured 401 for a malformed cached-provider logout token', async () => {
    deleteCachedUserMock.mockRejectedValueOnce(
      Object.assign(new Error('Authorization token is malformed'), {
        name: 'InvalidTokenError',
      }),
    );
    const response = createResponse();

    await logout(
      { headers: { authorization: 'apple:Bearer malformed-token' } },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.body.error).toBe('invalid_token');
  });
});