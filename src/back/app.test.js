import request from 'supertest';
import app from './app';
import formurlencoded from 'form-urlencoded';

describe('/token', () => {
  it('requires matching client_id', (done) => {
    request(app)
      .post('/token')
      .send('client_id=blah')
      .expect(400)
      .expect(/invalid client_id/, done);
  });
  it('requires all params', (done) => {
    // missing grant_type
    const params = {
      client_id: process.env.CLIENT_ID,
      code_verifier: 'blah',
      code_challenge: 'blah',
      redirect_uri: 'blah',
      code: 'code',
    };
    request(app)
      .post('/token')
      .send(formurlencoded(params))
      .expect(400)
      .expect(/grant_type is required/, done);
  });
});
