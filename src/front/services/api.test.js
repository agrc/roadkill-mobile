let mockAuth;
let mockFetch;
let mockSentry;
let useAPI;

beforeEach(() => {
  jest.resetModules();
  mockAuth = {
    getBearerToken: jest.fn().mockResolvedValue('google:Bearer access-token'),
    getSessionSnapshot: jest.fn().mockReturnValue({
      generation: 2,
      owner: { providerName: 'google', subject: 'subject', userId: 'user-1' },
    }),
    isSessionCurrent: jest.fn().mockReturnValue(true),
    handleAPIError: jest.fn(),
  };
  mockFetch = jest.fn();
  mockSentry = { captureException: jest.fn() };

  jest.doMock('../auth/context', () => ({
    __esModule: true,
    default: () => mockAuth,
  }));
  jest.doMock('../services/config', () => ({
    __esModule: true,
    default: { API: 'https://api.example.test' },
  }));
  jest.doMock('common/config', () => ({
    __esModule: true,
    default: { versionHeaderName: 'x-api-version', apiVersion: '1' },
  }));
  jest.doMock('./fetch', () => ({ __esModule: true, default: mockFetch }));
  jest.doMock('@sentry/react-native', () => mockSentry);

  useAPI = require('./api').useAPI;
});

describe('useAPI session recovery', () => {
  it('does not call fetch with an empty bearer header', async () => {
    mockAuth.getBearerToken.mockResolvedValue('google:Bearer ');
    const api = useAPI();

    await expect(api.get('submissions')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it.each([
    [401, { error: 'invalid_token' }, 'sign-in'],
    [403, { error: 'registration_required' }, 'registration'],
  ])('sends structured %i recovery responses to auth state', async (status, data) => {
    const error = Object.assign(new Error('request rejected'), {
      name: 'HTTPError',
      status,
      data,
    });
    mockFetch.mockRejectedValue(error);
    const api = useAPI();

    await expect(api.get('submissions')).rejects.toBe(error);

    expect(mockAuth.handleAPIError).toHaveBeenCalledWith(
      error,
      mockAuth.getSessionSnapshot.mock.results[0].value,
    );
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('does not turn a service outage into auth recovery and captures it once', async () => {
    const error = Object.assign(new Error('service unavailable'), {
      name: 'HTTPError',
      status: 503,
      data: { error: 'service_unavailable' },
    });
    mockFetch.mockRejectedValue(error);
    const api = useAPI();

    await expect(api.get('submissions')).rejects.toBe(error);

    expect(mockAuth.handleAPIError).not.toHaveBeenCalled();
    expect(mockSentry.captureException).toHaveBeenCalledTimes(1);
    expect(error.__sentryCaptured).toBe(true);
  });

  it.each([
    ['POST', (api) => api.post('reports/report', {})],
    ['GET', (api) => api.get('submissions')],
    ['DELETE', (api) => api.deleteAccount()],
  ])(
    'does not dispatch an unscoped %s request if token acquisition changes the session',
    async (_method, makeRequest) => {
      const originSession = {
        generation: 2,
        owner: { providerName: 'google', subject: 'old-subject', userId: 'old-user' },
      };
      const changedSession = {
        generation: 3,
        owner: { providerName: 'apple', subject: 'new-subject', userId: 'new-user' },
      };
      let currentSession = originSession;
      mockAuth.getSessionSnapshot.mockImplementation(() => currentSession);
      mockAuth.getBearerToken.mockImplementation(async (expectedSession) => {
        expect(expectedSession).toBe(originSession);
        currentSession = changedSession;

        return 'apple:Bearer new-access-token';
      });
      mockAuth.isSessionCurrent.mockImplementation(
        (snapshot) => snapshot === currentSession,
      );
      const api = useAPI();

      await expect(makeRequest(api)).rejects.toMatchObject({
        code: 'SESSION_CHANGED',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('allows an unscoped request when bearer renewal keeps the same session', async () => {
    const originSession = mockAuth.getSessionSnapshot();
    mockAuth.getBearerToken.mockImplementation(async (expectedSession) => {
      expect(expectedSession).toBe(originSession);

      return 'google:Bearer renewed-access-token';
    });
    mockFetch.mockResolvedValue({ ok: true });
    const api = useAPI();

    await api.post('reports/report', {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('passes an expected owner snapshot to queued report requests', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const api = useAPI();
    const expectedSession = mockAuth.getSessionSnapshot();

    await api.postReport(
      { animal_location: 'POINT(1 2)' },
      'report',
      expectedSession,
    );

    expect(mockAuth.getBearerToken).toHaveBeenCalledWith(expectedSession);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.test/reports/report',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'google:Bearer access-token',
        }),
      }),
      true,
    );
  });

  it('stops before fetch when the owner changes during token acquisition', async () => {
    const oldSession = {
      generation: 2,
      owner: { providerName: 'google', subject: 'old-subject', userId: 'old-user' },
    };
    const currentSession = {
      generation: 3,
      owner: { providerName: 'google', subject: 'new-subject', userId: 'new-user' },
    };
    mockAuth.getBearerToken.mockResolvedValue('google:Bearer new-access-token');
    mockAuth.getSessionSnapshot.mockReturnValue(currentSession);
    mockAuth.isSessionCurrent.mockImplementation(
      (snapshot) => snapshot.generation === currentSession.generation,
    );
    const api = useAPI();

    await expect(api.postReport({}, 'report', oldSession)).rejects.toMatchObject({
      code: 'SESSION_CHANGED',
    });

    expect(mockAuth.getBearerToken).toHaveBeenCalledWith(oldSession);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});