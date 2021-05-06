import request from 'supertest';
import app from './app';
import formurlencoded from 'form-urlencoded';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const utahIdServer = setupServer(
  rest.post('https://login.dts.utah.gov:443/sso/oauth2/access_token', (request, response, context) => {
    return response(context.json({ token: 'blah' }));
  })
);

beforeAll(() => utahIdServer.listen());
afterEach(() => utahIdServer.resetHandlers());
afterAll(() => utahIdServer.close());

describe('/token', () => {
  it('requires matching client_id', (done) => {
    request(app)
      .post('/token')
      .send('client_id=blah')
      .expect(400)
      .expect(/invalid client_id/, done);
  });
  it('requires grant_type always', (done) => {
    const params = {
      client_id: process.env.CLIENT_ID,
      code_verifier: 'blah',
      code_challenge: 'blah',
      redirect_uri: 'blah',
      code: 'code',
      refresh_token: 'blah',
    };
    request(app)
      .post('/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/invalid grant_type/, done);
  });
  it('requires appropriate params when exchanging code for token', (done) => {
    // missing grant_type
    const params = {
      grant_type: 'authorization_code',
      client_id: process.env.CLIENT_ID,
      code_verifier: 'blah',
      code_challenge: 'blah',
      code: 'code',
    };
    request(app)
      .post('/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/redirect_uri is required/, done);
  });
  it('requires appropriate params for refresh token', (done) => {
    const params = {
      grant_type: 'refresh_token',
      client_id: process.env.CLIENT_ID,
    };
    request(app)
      .post('/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/refresh_token is required/, done);
  });
});
