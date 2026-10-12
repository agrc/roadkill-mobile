import { Buffer } from 'node:buffer';

const ACCESS_TOKEN_KEY = 'UTAHID_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'UTAHID_REFRESH_TOKEN';
const ID_TOKEN_KEY = 'UTAHID_ID_TOKEN';

const makeToken = (sub, exp) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none' })}.${encode({ sub, exp })}.signature`;
};

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
let mockPromptAsync;
let mockRefreshAsync;
let mockExchangeCodeAsync;
let mockRevokeAsync;
let mockFetch;
let useUtahIDProvider;

function renderProvider() {
  mockRuntime.beginRender();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useUtahIDProvider();
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
  mockPromptAsync = jest.fn();
  mockRefreshAsync = jest.fn();
  mockExchangeCodeAsync = jest.fn();
  mockRevokeAsync = jest.fn().mockResolvedValue(undefined);
  mockFetch = jest.fn().mockResolvedValue({ status: 204 });

  jest.doMock('react', () => ({ __esModule: true, default: mockRuntime }));
  jest.doMock('expo-auth-session', () => ({
    exchangeCodeAsync: mockExchangeCodeAsync,
    refreshAsync: mockRefreshAsync,
    revokeAsync: mockRevokeAsync,
    useAuthRequest: () => [
      {
        clientId: 'utah-client',
        codeVerifier: 'code-verifier',
        codeChallenge: 'code-challenge',
      },
      null,
      mockPromptAsync,
    ],
  }));
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { scheme: 'roadkill' } },
  }));
  jest.doMock('jwt-decode', () => ({
    jwtDecode: (token) =>
      JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()),
  }));
  jest.doMock('common/config', () => ({
    __esModule: true,
    default: { authProviderNames: { utahid: 'utahid' } },
  }));
  jest.doMock('../../services/config', () => ({
    __esModule: true,
    default: {
      API: 'https://api.example.test',
      CLIENT_ID: 'utah-client',
      OAUTH_REDIRECT_SCREEN: 'oauthredirect',
    },
  }));
  jest.doMock('../../services/fetch', () => ({
    __esModule: true,
    default: mockFetch,
  }));
  jest.doMock('../../services/utilities', () => ({
    useAsyncError: () => jest.fn(),
    isTokenExpired: (token) => token.exp * 1000 <= Date.now(),
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
          typeof value === 'object' ? JSON.stringify(value) : value,
        );
      };

      return [ref, setRef, readiness.current.promise];
    },
  }));

  useUtahIDProvider = require('./utahid').default;
});

describe('useUtahIDProvider', () => {
  it('persists refreshed access, refresh, and ID tokens and updates identity', async () => {
    const now = Date.now() / 1000;
    const oldIdToken = makeToken('old-subject', now + 3600);
    const stored = {
      [ACCESS_TOKEN_KEY]: makeToken('old-subject', now + 30),
      [REFRESH_TOKEN_KEY]: makeToken('old-subject', now + 3600),
      [ID_TOKEN_KEY]: oldIdToken,
    };
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(stored[key] ?? null),
    );
    const nextIdToken = makeToken('new-subject', now + 7200);
    const nextRefreshToken = makeToken('new-subject', now + 7200);
    const nextAccessToken = makeToken('new-subject', now + 3600);
    mockRefreshAsync.mockResolvedValue({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      idToken: nextIdToken,
    });

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).resolves.toBe(
      `utahid:Bearer ${nextAccessToken}`,
    );
    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(provider.getIdentity()).toBe('new-subject');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      ACCESS_TOKEN_KEY,
      nextAccessToken,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      REFRESH_TOKEN_KEY,
      nextRefreshToken,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      ID_TOKEN_KEY,
      nextIdToken,
    );
  });

  it('preserves stored refresh and ID tokens when renewal omits replacements', async () => {
    const now = Date.now() / 1000;
    const originalRefreshToken = makeToken('stored-subject', now + 3600);
    const originalIdToken = makeToken('stored-subject', now + 3600);
    const stored = {
      [ACCESS_TOKEN_KEY]: makeToken('stored-subject', now + 30),
      [REFRESH_TOKEN_KEY]: originalRefreshToken,
      [ID_TOKEN_KEY]: originalIdToken,
    };
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(stored[key] ?? null),
    );
    const renewedAccessToken = makeToken('stored-subject', now + 3600);
    mockRefreshAsync.mockResolvedValue({ accessToken: renewedAccessToken });

    const provider = await initializeProvider();
    await provider.getBearerToken();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      REFRESH_TOKEN_KEY,
      originalRefreshToken,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      ID_TOKEN_KEY,
      originalIdToken,
    );
  });

  it('requires explicit sign-in when no usable session exists', async () => {
    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.getIdentity()).toBeNull();
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['cancel', { type: 'cancel' }],
    ['dismiss', { type: 'dismiss' }],
    ['denied', { type: 'error', error: { code: 'access_denied' } }],
    ['cancel error', { type: 'error', error: { code: 'ERR_REQUEST_CANCELED' } }],
  ])('returns null when explicit UtahID sign-in is %s', async (_name, response) => {
    mockPromptAsync.mockResolvedValue(response);

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toBeNull();
    expect(mockExchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('returns null when the UtahID prompt rejects as cancelled', async () => {
    mockPromptAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toBeNull();
  });

  it('does not invent identity when the successful exchange has no ID token', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'authorization-code' },
    });
    mockExchangeCodeAsync.mockResolvedValue({
      accessToken: makeToken('unverified-subject', Date.now() / 1000 + 3600),
      refreshToken: makeToken('unverified-subject', Date.now() / 1000 + 7200),
    });

    const provider = await initializeProvider();

    await expect(provider.logIn()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('single-flights concurrent explicit sign-in prompts', async () => {
    let finishPrompt;
    mockPromptAsync.mockReturnValue(
      new Promise((resolve) => {
        finishPrompt = resolve;
      }),
    );

    const provider = await initializeProvider();
    const first = provider.logIn();
    const second = provider.logIn();
    await flushPromises();

    expect(mockPromptAsync).toHaveBeenCalledTimes(1);
    finishPrompt({ type: 'cancel' });
    await expect(Promise.all([first, second])).resolves.toEqual([null, null]);
  });

  it('settles a failed UtahID code exchange and permits a later sign-in', async () => {
    const exchangeError = new Error('exchange failed');
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'authorization-code' },
    });
    mockExchangeCodeAsync
      .mockRejectedValueOnce(exchangeError)
      .mockResolvedValueOnce({
        accessToken: makeToken('verified-subject', Date.now() / 1000 + 3600),
        refreshToken: makeToken('verified-subject', Date.now() / 1000 + 7200),
        idToken: makeToken('verified-subject', Date.now() / 1000 + 7200),
      });

    const provider = await initializeProvider();

    await expect(provider.logIn()).rejects.toBe(exchangeError);
    await expect(provider.logIn()).resolves.toMatchObject({
      sub: 'verified-subject',
    });
    expect(mockPromptAsync).toHaveBeenCalledTimes(2);
    expect(mockExchangeCodeAsync).toHaveBeenCalledTimes(2);
  });

  it('rejects expired refresh credentials without prompting', async () => {
    const now = Date.now() / 1000;
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(
        {
          [ACCESS_TOKEN_KEY]: makeToken('stored-subject', now - 30),
          [REFRESH_TOKEN_KEY]: makeToken('stored-subject', now - 1),
          [ID_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
        }[key] ?? null,
      ),
    );

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockRefreshAsync).not.toHaveBeenCalled();
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it('maps a revoked refresh response to AUTH_REQUIRED and clears the session', async () => {
    const now = Date.now() / 1000;
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(
        {
          [ACCESS_TOKEN_KEY]: makeToken('stored-subject', now - 1),
          [REFRESH_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
          [ID_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
        }[key] ?? null,
      ),
    );
    mockRefreshAsync.mockRejectedValue({ error: 'invalid_grant' });

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it('single-flights concurrent UtahID refresh requests', async () => {
    const now = Date.now() / 1000;
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(
        {
          [ACCESS_TOKEN_KEY]: makeToken('stored-subject', now + 30),
          [REFRESH_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
          [ID_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
        }[key] ?? null,
      ),
    );
    let finishRefresh;
    mockRefreshAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );

    const provider = await initializeProvider();
    const first = provider.getBearerToken();
    const second = provider.getBearerToken();
    await flushPromises();

    expect(mockRefreshAsync).toHaveBeenCalledTimes(1);
    const renewedAccessToken = makeToken('stored-subject', now + 3600);
    finishRefresh({ accessToken: renewedAccessToken });
    await expect(Promise.all([first, second])).resolves.toEqual([
      `utahid:Bearer ${renewedAccessToken}`,
      `utahid:Bearer ${renewedAccessToken}`,
    ]);
  });

  it('does not restore a session when logout wins a pending refresh', async () => {
    const now = Date.now() / 1000;
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(
        {
          [ACCESS_TOKEN_KEY]: makeToken('stored-subject', now + 30),
          [REFRESH_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
          [ID_TOKEN_KEY]: makeToken('stored-subject', now + 3600),
        }[key] ?? null,
      ),
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
      accessToken: makeToken('late-subject', now + 3600),
      refreshToken: makeToken('late-subject', now + 7200),
      idToken: makeToken('late-subject', now + 7200),
    });

    await expect(pendingBearer).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      ACCESS_TOKEN_KEY,
      'null',
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      REFRESH_TOKEN_KEY,
      'null',
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      ID_TOKEN_KEY,
      'null',
    );
  });

  it('does not let a pending refresh overwrite a newly selected account', async () => {
    const now = Date.now() / 1000;
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(
        {
          [ACCESS_TOKEN_KEY]: makeToken('old-subject', now + 30),
          [REFRESH_TOKEN_KEY]: makeToken('old-subject', now + 3600),
          [ID_TOKEN_KEY]: makeToken('old-subject', now + 3600),
        }[key] ?? null,
      ),
    );
    let finishRefresh;
    mockRefreshAsync.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'new-account-code' },
    });
    const newTokens = {
      accessToken: makeToken('new-subject', now + 3600),
      refreshToken: makeToken('new-subject', now + 7200),
      idToken: makeToken('new-subject', now + 7200),
    };
    mockExchangeCodeAsync.mockResolvedValue(newTokens);

    const provider = await initializeProvider();
    const pendingBearer = provider.getBearerToken();
    await flushPromises();
    await expect(provider.logIn()).resolves.toMatchObject({
      sub: 'new-subject',
    });

    finishRefresh({
      accessToken: makeToken('old-subject', now + 7200),
      refreshToken: makeToken('old-subject', now + 10800),
      idToken: makeToken('old-subject', now + 10800),
    });

    await expect(pendingBearer).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(provider.getIdentity()).toBe('new-subject');
    const writes = mockSecureStore.setItemAsync.mock.calls;
    expect(
      writes.filter(([key]) => key === ACCESS_TOKEN_KEY).at(-1),
    ).toEqual([ACCESS_TOKEN_KEY, newTokens.accessToken]);
    expect(writes.filter(([key]) => key === ID_TOKEN_KEY).at(-1)).toEqual([
      ID_TOKEN_KEY,
      newTokens.idToken,
    ]);
  });

  it('settles readiness after secure-store hydration fails', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('storage failed'));

    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.getIdentity()).toBeNull();
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
  });
});