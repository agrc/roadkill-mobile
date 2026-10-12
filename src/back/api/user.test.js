import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../app';
import { getLogin, getRegister } from './user';

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
      auth_provider: 'google',
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
      response.locals = { authId: 'verified-subject', authProvider: 'google' };
      response.status = vi.fn().mockReturnValue(response);
      response.json = vi.fn();

      return response;
    };
    const responseMock = getResponseMock();
    await getLogin(getUser, updateUser, getConstants)(requestMock, responseMock);

    expect(getUser).toHaveBeenCalledWith('verified-subject', 'google');
    expect(getConstants).toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith({
      ...body,
      auth_id: 'verified-subject',
      auth_provider: 'google',
    });
    expect(responseMock.status).toHaveBeenCalledWith(200);
  });

  it('registers the verified identity instead of body identity fields', async () => {
    const requestMock = {
      body: {
        organization: null,
        user: {
          auth_id: 'stale-subject',
          auth_provider: 'utahid',
          email: 'test@test.com',
          first_name: 'Test',
          last_name: 'User',
          phone: '555-5555',
          role: 'reporter',
        },
      },
    };
    const responseMock = {
      locals: { authId: 'verified-subject', authProvider: 'google' },
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const isExistingUser = vi.fn().mockResolvedValue(false);
    const registerUser = vi.fn().mockResolvedValue(undefined);
    const getUser = vi.fn().mockResolvedValue({ id: 1 });

    await getRegister(isExistingUser, registerUser, getUser)(
      requestMock,
      responseMock,
    );

    const expectedUser = {
      ...requestMock.body.user,
      auth_id: 'verified-subject',
      auth_provider: 'google',
    };
    expect(isExistingUser).toHaveBeenCalledWith(expectedUser);
    expect(registerUser).toHaveBeenCalledWith(null, expectedUser);
    expect(getUser).toHaveBeenCalledWith('verified-subject', 'google');
  });
});
