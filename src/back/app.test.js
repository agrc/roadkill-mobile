import formurlencoded from 'form-urlencoded';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAppUserMock, uploadMock, multerMiddlewareMock } = vi.hoisted(() => ({
  getAppUserMock: vi.fn(),
  uploadMock: vi.fn(),
  multerMiddlewareMock: vi.fn((request, response, next) => next()),
}));

vi.mock('multer', () => {
  const multer = vi.fn(() => ({ single: vi.fn(() => multerMiddlewareMock) }));
  multer.memoryStorage = vi.fn(() => ({}));
  return { default: multer };
});
vi.mock('./services/user_management.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getUser: getAppUserMock,
}));
vi.mock('./services/photos.js', () => ({
  getPhoto: vi.fn(),
  upload: uploadMock,
}));
vi.mock('./services/id_images.js', () => ({ getIDImage: vi.fn() }));

import app from './app';
import getSecret from './services/secrets';

const utahIdServer = setupServer(
  http.post('https://login.dts.utah.gov/sso/oauth2/access_token', () => {
    return HttpResponse.json({ token: 'blah' });
  }),
  http.get('https://openidconnect.googleapis.com/v1/userinfo', () => {
    return HttpResponse.json({ sub: 'unregistered-provider-subject' });
  }),
);

beforeAll(() => utahIdServer.listen({ onUnhandledRequest: 'bypass' }));
beforeEach(() => {
  getAppUserMock.mockClear();
  getAppUserMock.mockResolvedValue(undefined);
  uploadMock.mockClear();
  multerMiddlewareMock.mockClear();
});
afterEach(() => utahIdServer.resetHandlers());
afterAll(() => utahIdServer.close());

describe('registered-user access control', () => {
  it.each([
    ['GET', '/user/profile'],
    ['POST', '/user/profile/update'],
    ['DELETE', '/user/delete'],
    ['POST', '/reports/report'],
    ['POST', '/reports/pickup'],
    ['POST', '/routes/route'],
    ['GET', '/submissions'],
    ['GET', '/reports/report/1'],
    ['GET', '/routes/route/1'],
  ])('blocks unregistered identity from %s %s', async (method, path) => {
    let testRequest = request(app)[method.toLowerCase()](path).set(
      'Authorization',
      'google:Bearer provider-token',
    );
    if (method === 'POST') {
      testRequest = testRequest.send({});
    }
    if (path === '/reports/report' || path === '/reports/pickup') {
      testRequest = request(app)
        .post(path)
        .set('Authorization', 'google:Bearer provider-token')
        .attach('photo', Buffer.from('photo'), 'photo.jpg');
    }

    const result = await testRequest;

    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      error: 'registration_required',
      error_description:
        'Register this identity before accessing this resource',
    });
    if (path === '/reports/report' || path === '/reports/pickup') {
      expect(multerMiddlewareMock).not.toHaveBeenCalled();
      expect(uploadMock).not.toHaveBeenCalled();
    }
  });
});

describe('public image access', () => {
  it.each(['/photos/thumb/1', '/photos/1', '/reports/id_image/key/1'])(
    'allows anonymous requests to %s',
    async (path) => {
      await request(app).get(path).expect(404);
      expect(getAppUserMock).not.toHaveBeenCalled();
    },
  );
});

describe('/user/token', () => {
  it('requires matching client_id', async () => {
    return request(app)
      .post('/user/token')
      .send('client_id=blah')
      .expect(400)
      .expect(/invalid client_id/);
  });
  it('requires grant_type always', async () => {
    const params = {
      client_id: getSecret('client-id'),
      code_verifier: 'blah',
      code_challenge: 'blah',
      redirect_uri: 'blah',
      code: 'code',
      refresh_token: 'blah',
    };

    return request(app)
      .post('/user/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/invalid grant_type/);
  });
  it('requires appropriate params when exchanging code for token', async () => {
    // missing grant_type
    const params = {
      grant_type: 'authorization_code',
      client_id: getSecret('client-id'),
      code_verifier: 'blah',
      code_challenge: 'blah',
      code: 'code',
    };

    return request(app)
      .post('/user/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/redirect_uri is required/);
  });
  it('requires appropriate params for refresh token', async () => {
    const params = {
      grant_type: 'refresh_token',
      client_id: getSecret('client-id'),
    };

    return request(app)
      .post('/user/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/refresh_token is required/);
  });

  it('preserves a structured invalid_grant response without exposing provider details', async () => {
    utahIdServer.use(
      http.post(
        'https://login.dts.utah.gov/sso/oauth2/access_token',
        () =>
          HttpResponse.json(
            {
              error: 'invalid_grant',
              error_description: 'refresh token private-refresh-token revoked',
            },
            { status: 400 },
          ),
      ),
    );

    const result = await request(app)
      .post('/user/token')
      .type('form')
      .send(
        formurlencoded({
          grant_type: 'refresh_token',
          client_id: getSecret('client-id'),
          refresh_token: 'private-refresh-token',
        }),
      );

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('invalid_grant');
    expect(result.body.error_description).not.toContain('private-refresh-token');
  });

  it('keeps unrelated provider 4xx responses out of the invalid-token path', async () => {
    utahIdServer.use(
      http.post(
        'https://login.dts.utah.gov/sso/oauth2/access_token',
        () =>
          HttpResponse.json(
            { error: 'invalid_request', error_description: 'private details' },
            { status: 400 },
          ),
      ),
    );

    const result = await request(app)
      .post('/user/token')
      .type('form')
      .send(
        formurlencoded({
          grant_type: 'refresh_token',
          client_id: getSecret('client-id'),
          refresh_token: 'refresh-token',
        }),
      );

    expect(result.status).toBe(400);
    expect(result.body.error).not.toBe('invalid_token');
    expect(result.body.error_description).not.toContain('private details');
  });

  it('keeps UtahID provider outages in the 5xx path without exposing provider details', async () => {
    utahIdServer.use(
      http.post(
        'https://login.dts.utah.gov/sso/oauth2/access_token',
        () =>
          HttpResponse.json(
            { error: 'server_error', error_description: 'private outage details' },
            { status: 503 },
          ),
      ),
    );

    const result = await request(app)
      .post('/user/token')
      .type('form')
      .send(
        formurlencoded({
          grant_type: 'refresh_token',
          client_id: getSecret('client-id'),
          refresh_token: 'refresh-token',
        }),
      );

    expect(result.status).toBe(502);
    expect(result.body.error).toBe('server_error');
    expect(result.body.error_description).not.toContain('private outage details');
  });
});
