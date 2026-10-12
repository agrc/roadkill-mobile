import { isAuthenticationExpired } from './google';

const GOOGLE_AUTH_KEY = 'GOOGLE_AUTHENTICATION';

function createHookRuntime() {
  const refs = [];
  const states = [];
  let hookIndex = 0;
  let effects = [];

  return {
    beginRender() {
      hookIndex = 0;
      effects = [];
    },
    useRef(initialValue) {
      const index = hookIndex++;
      if (!(index in refs)) refs[index] = { current: initialValue };

      return refs[index];
    },
    useState(initialValue) {
      const index = hookIndex++;
      if (!(index in states)) states[index] = initialValue;

      return [
        states[index],
        (value) => {
          states[index] =
            typeof value === 'function' ? value(states[index]) : value;
        },
      ];
    },
    useCallback(callback) {
      hookIndex++;

      return callback;
    },
    useEffect(effect) {
      hookIndex++;
      effects.push(effect);
    },
    get effects() {
      return effects;
    },
  };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

let mockRuntime;
let mockSecureStore;
let mockUseAuthRequest;
let mockPromptAsync;
let mockRefreshAsync;
let mockExchangeCodeAsync;
let mockFetch;
let useGoogleProvider;

function renderProvider() {
  mockRuntime.beginRender();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGoogleProvider();
}

async function initializeProvider() {
  renderProvider();
  mockRuntime.effects.forEach((effect) => effect());
  await flushPromises();

  return renderProvider();
}

beforeEach(() => {
  jest.resetModules();
  mockRuntime = createHookRuntime();
  mockSecureStore = {
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
  };
  mockUseAuthRequest = jest.fn(() => [
    {
      clientId: 'google-client',
      codeVerifier: 'code-verifier',
      redirectUri: 'roadkill:/oauthredirect',
    },
    null,
    mockPromptAsync,
  ]);
  mockPromptAsync = jest.fn();
  mockRefreshAsync = jest.fn();
  mockExchangeCodeAsync = jest.fn();
  mockFetch = jest.fn();

  class MockTokenResponse {
    constructor(response) {
      Object.assign(this, {
        tokenType: 'bearer',
        issuedAt: Date.now() / 1000,
        ...response,
      });
    }

    getRequestConfig() {
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresIn: this.expiresIn,
        issuedAt: this.issuedAt,
        tokenType: this.tokenType,
        idToken: this.idToken,
        scope: this.scope,
        state: this.state,
      };
    }

    async refreshAsync(options, discovery) {
      const response = await mockRefreshAsync(options, discovery);
      Object.assign(this, {
        ...response,
        refreshToken: response.refreshToken ?? this.refreshToken,
      });
      return this;
    }
  }

  jest.doMock('react', () => ({ __esModule: true, default: mockRuntime }));
  jest.doMock('expo-auth-session/providers/google', () => ({
    discovery: { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
    useAuthRequest: mockUseAuthRequest,
  }));
  jest.doMock('expo-auth-session', () => ({
    TokenResponse: MockTokenResponse,
    exchangeCodeAsync: mockExchangeCodeAsync,
    revokeAsync: jest.fn(),
  }));
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: {} } },
  }));
  jest.doMock('common/config', () => ({
    __esModule: true,
    default: { authProviderNames: { google: 'google' } },
  }));
  jest.doMock('../../services/config', () => ({
    __esModule: true,
    default: { OAUTH_REDIRECT_SCREEN: 'oauthredirect' },
  }));
  jest.doMock('../../services/fetch', () => ({
    __esModule: true,
    default: mockFetch,
  }));
  jest.doMock('../../services/utilities', () => ({
    useAsyncError: () => jest.fn(),
    useSecureRef(key) {
      const ref = mockRuntime.useRef(undefined);
      const readiness = mockRuntime.useRef(null);
      if (!readiness.current) {
        let resolve;
        readiness.current = {
          promise: new Promise((ready) => {
            resolve = ready;
          }),
          resolve: null,
        };
        readiness.current.resolve = resolve;
      }
      mockRuntime.useEffect(() => {
        mockSecureStore
          .getItemAsync(key)
          .then((value) => {
            if (ref.current === undefined) {
              try {
                ref.current = JSON.parse(value);
              } catch {
                ref.current = value;
              }
            }
          })
          .catch(() => {
            if (ref.current === undefined) ref.current = null;
          })
          .finally(readiness.current.resolve);
      }, [key]);

      const setRef = (value) => {
        ref.current = value;
        return mockSecureStore.setItemAsync(
          key,
          JSON.stringify(value),
          { keychainAccessible: 'ALWAYS' },
        );
      };

      return [ref, setRef, readiness.current.promise];
    },
  }));

  useGoogleProvider = require('./google').default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isAuthenticationExpired', () => {
  it('checks a future date appropriately', () => {
    const authentication = {
      expiresIn: '3599',
      issuedAt: Date.now() / 1000,
    };

    expect(isAuthenticationExpired(authentication)).toBe(false);
  });
  it('checks an expired date appropriately', () => {
    const authentication = {
      expiresIn: '3599',
      issuedAt: Date.now() / 1000 - 60 * 60,
    };

    expect(isAuthenticationExpired(authentication)).toBe(true);
  });

  it('treats a token inside the refresh margin as expired', () => {
    const authentication = {
      expiresIn: 3600,
      issuedAt: Date.now() / 1000 - 3590,
    };

    expect(isAuthenticationExpired(authentication)).toBe(true);
  });

  it('treats incomplete token expiry metadata as expired', () => {
    expect(isAuthenticationExpired({ accessToken: 'token' })).toBe(true);
  });
});

describe('useGoogleProvider', () => {
  it('restores and silently renews a session without prompting, persisting token rotation and identity', async () => {
    const originalRefreshToken = 'stored-refresh-token';
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'expired-soon-access-token',
        refreshToken: originalRefreshToken,
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3560,
        tokenType: 'bearer',
        subject: 'old-subject',
      }),
    );
    mockRefreshAsync.mockResolvedValue({
      accessToken: 'renewed-access-token',
      refreshToken: 'rotated-refresh-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
      tokenType: 'bearer',
    });
    mockFetch.mockResolvedValue({ sub: 'verified-subject' });

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).resolves.toBe(
      'google:Bearer renewed-access-token',
    );
    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(mockRefreshAsync).toHaveBeenCalledWith(
      { clientId: 'google-client' },
      expect.objectContaining({
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      }),
    );
    expect(provider.getIdentity()).toBe('verified-subject');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      GOOGLE_AUTH_KEY,
      expect.stringContaining('rotated-refresh-token'),
      expect.anything(),
    );
  });

  it('preserves a stored refresh token when renewal does not rotate it', async () => {
    const originalRefreshToken = 'original-refresh-token';
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'expiring-access-token',
        refreshToken: originalRefreshToken,
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3560,
        subject: 'stored-subject',
      }),
    );
    mockRefreshAsync.mockResolvedValue({
      accessToken: 'renewed-access-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });
    mockFetch.mockResolvedValue({ sub: 'stored-subject' });

    const provider = await initializeProvider();
    await provider.getBearerToken();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      GOOGLE_AUTH_KEY,
      expect.stringContaining(originalRefreshToken),
      expect.anything(),
    );
  });

  it('rejects when sign-in is required and never prompts from the bearer path', async () => {
    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['cancel', { type: 'cancel' }],
    ['dismiss', { type: 'dismiss' }],
    ['denied', { type: 'error', error: { code: 'access_denied' } }],
  ])('returns null when explicit Google sign-in is %s', async (_name, response) => {
    mockPromptAsync.mockResolvedValue(response);

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when the Google prompt rejects as cancelled', async () => {
    mockPromptAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toBeNull();
  });

  it('requests offline access without forcing a consent prompt', async () => {
    await initializeProvider();

    expect(mockUseAuthRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        extraParams: { access_type: 'offline' },
        selectAccount: true,
        shouldAutoExchangeCode: false,
      }),
    );
  });

  it('exchanges an authorization code and returns the verified Google user', async () => {
    const authentication = {
      accessToken: 'interactive-access-token',
      refreshToken: 'interactive-refresh-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    };
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'authorization-code' },
    });
    mockExchangeCodeAsync.mockResolvedValue(authentication);
    mockFetch.mockResolvedValue({ sub: 'verified-google-subject' });

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toEqual({
      sub: 'verified-google-subject',
    });
    expect(mockExchangeCodeAsync).toHaveBeenCalledWith(
      {
        clientId: 'google-client',
        code: 'authorization-code',
        redirectUri: 'roadkill:/oauthredirect',
        extraParams: { code_verifier: 'code-verifier' },
      },
      expect.objectContaining({
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      }),
    );
    expect(provider.getIdentity()).toBe('verified-google-subject');
  });

  it('does not persist or invent identity when Google userinfo has no subject', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'authorization-code' },
    });
    mockExchangeCodeAsync.mockResolvedValue({
      accessToken: 'interactive-access-token',
      refreshToken: 'interactive-refresh-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });
    mockFetch.mockResolvedValue({ email: 'person@example.test' });

    const provider = await initializeProvider();

    await expect(provider.logIn()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('settles failed code exchange and permits a later explicit sign-in', async () => {
    const exchangeError = new Error('exchange failed');
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'authorization-code' },
    });
    mockExchangeCodeAsync
      .mockRejectedValueOnce(exchangeError)
      .mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000,
      });
    mockFetch.mockResolvedValue({ sub: 'verified-subject' });

    const provider = await initializeProvider();

    await expect(provider.logIn()).rejects.toBe(exchangeError);
    await expect(provider.logIn()).resolves.toEqual({
      sub: 'verified-subject',
    });
    expect(mockPromptAsync).toHaveBeenCalledTimes(2);
  });

  it('single-flights concurrent silent refresh requests', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'expiring-access-token',
        refreshToken: 'stored-refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3560,
        subject: 'stored-subject',
      }),
    );
    let finishRefresh;
    mockRefreshAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );
    mockFetch.mockResolvedValue({ sub: 'stored-subject' });

    const provider = await initializeProvider();
    const first = provider.getBearerToken();
    const second = provider.getBearerToken();
    await flushPromises();

    expect(mockRefreshAsync).toHaveBeenCalledTimes(1);
    finishRefresh({
      accessToken: 'renewed-access-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });
    await expect(Promise.all([first, second])).resolves.toEqual([
      'google:Bearer renewed-access-token',
      'google:Bearer renewed-access-token',
    ]);
  });

  it('requires explicit sign-in after a revoked refresh token', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'expired-access-token',
        refreshToken: 'revoked-refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3600,
        subject: 'stored-subject',
      }),
    );
    mockRefreshAsync.mockRejectedValue({ error: 'invalid_grant' });

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it('does not restore a session when logout wins a pending refresh', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'expiring-access-token',
        refreshToken: 'stored-refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3560,
        subject: 'stored-subject',
      }),
    );
    let finishRefresh;
    mockRefreshAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );

    const provider = await initializeProvider();
    const pendingBearer = provider.getBearerToken();
    await flushPromises();
    await provider.logOut();
    finishRefresh({
      accessToken: 'late-access-token',
      refreshToken: 'late-refresh-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });

    await expect(pendingBearer).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      GOOGLE_AUTH_KEY,
      'null',
      expect.anything(),
    );
  });

  it('does not let a pending refresh overwrite a newly selected account', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'old-expiring-token',
        refreshToken: 'old-refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000 - 3560,
        subject: 'old-subject',
      }),
    );
    let finishRefresh;
    mockRefreshAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      authentication: {
        accessToken: 'new-account-token',
        refreshToken: 'new-account-refresh-token',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000,
      },
    });
    mockFetch.mockImplementation((_url, options) =>
      Promise.resolve({
        sub: options.headers.Authorization.includes('new-account-token')
          ? 'new-subject'
          : 'old-subject',
      }),
    );

    const provider = await initializeProvider();
    const pendingBearer = provider.getBearerToken();
    await flushPromises();
    await expect(provider.logIn()).resolves.toEqual({ sub: 'new-subject' });

    finishRefresh({
      accessToken: 'late-old-token',
      refreshToken: 'late-old-refresh-token',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });

    await expect(pendingBearer).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBe('new-subject');
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      GOOGLE_AUTH_KEY,
      expect.stringContaining('new-account-token'),
      expect.anything(),
    );
  });
});
