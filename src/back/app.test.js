import formurlencoded from 'form-urlencoded';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import app from './app';
import getSecret from './services/secrets';

const utahIdServer = setupServer(
  rest.post('https://login.dts.utah.gov:443/sso/oauth2/access_token', (request, response, context) => {
    return response(context.json({ token: 'blah' }));
  })
);

beforeAll(() => utahIdServer.listen());
afterEach(() => utahIdServer.resetHandlers());
afterAll(() => utahIdServer.close());

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
});
