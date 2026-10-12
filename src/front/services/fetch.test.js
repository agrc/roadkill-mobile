import myFetch from './fetch';

describe('myFetch structured HTTP errors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retains parsed response data and status on HTTPError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({
            error: 'registration_required',
            error_description: 'Register this identity first.',
          }),
        ),
    });

    await expect(myFetch('https://api.example.test/reports/report', {})).rejects.toMatchObject({
      name: 'HTTPError',
      status: 403,
      data: {
        error: 'registration_required',
        error_description: 'Register this identity first.',
      },
    });
  });
});