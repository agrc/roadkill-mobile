import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../app';
import { getLogin } from './user';

describe('user/approve', () => {
  it('returns appropriate error message on invalid guid', async () => {
    return request(app)
      .get('/user/approval/bad-guid/agency')
      .expect(401)
      .expect(/invalid/);
  });
});

describe('login', () => {
  it('calls update user if there is an existing user in the db', async () => {
    const userId = 1;
    const body = {
      auth_id: 123,
      auth_provider: 'facebook',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
    };
    const getUser = vi.fn().mockReturnValue(new Promise((resolve) => resolve({ id: userId })));
    const updateUser = vi.fn().mockReturnValue(new Promise((resolve) => resolve()));
    const getConstants = vi.fn().mockReturnValue(new Promise((resolve) => resolve({})));

    const requestMock = {
      body,
    };
    const getResponseMock = () => {
      const response = {};
      response.status = vi.fn().mockReturnValue(response);
      response.json = vi.fn();

      return response;
    };
    const responseMock = getResponseMock();
    await getLogin(getUser, updateUser, getConstants)(requestMock, responseMock);

    expect(getUser).toHaveBeenCalled();
    expect(getConstants).toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith(body);
    expect(responseMock.status).toHaveBeenCalledWith(200);
  });
});
