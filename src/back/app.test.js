import request from 'supertest';
import app from './app';

describe('/token', () => {
  it('requires specific parameters', (done) => {
    request(app).post('/token', { client_id: 'blah' }).expect(400, done);
  });
});
