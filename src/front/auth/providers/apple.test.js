import { Buffer } from 'node:buffer';

const STORE_KEY = 'roadkill-apple-user-info';

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

function makeToken(sub, exp) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none' })}.${encode({ sub, exp })}.signature`;
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

let mockRuntime;
let mockFetch;
let mockSecureStore;
let mockAppleAuthentication;
let useAppleProvider;

function renderProvider() {
  mockRuntime.beginRender();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAppleProvider();
}

async function initializeProvider() {
  renderProvider();
  mockRuntime.effects[0]();
  await flushPromises();

  return renderProvider();
}

beforeEach(() => {
  jest.resetModules();
  mockRuntime = createHookRuntime();
  mockFetch = jest.fn();
  mockSecureStore = {
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
  };
  mockAppleAuthentication = {
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: jest.fn(),
    refreshAsync: jest.fn(),
  };

  jest.doMock('react', () => ({ __esModule: true, default: mockRuntime }));
  jest.doMock('expo-apple-authentication', () => mockAppleAuthentication);
  jest.doMock('expo-secure-store', () => mockSecureStore);
  jest.doMock('common/config', () => ({
    __esModule: true,
    default: { authProviderNames: { apple: 'apple' } },
  }));
  jest.doMock('../../services/config', () => ({
    __esModule: true,
    default: { API: 'https://api.example.test' },
  }));
  jest.doMock('../../services/fetch', () => ({
    __esModule: true,
    default: mockFetch,
  }));

  useAppleProvider = require('./apple').default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAppleProvider', () => {
  it('renews an expiring token through the server and persists the replacement', async () => {
    const sub = 'apple-subject';
    const oldToken = makeToken(sub, Date.now() / 1000 + 60);
    const newToken = makeToken(sub, Date.now() / 1000 + 3600);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub, identityToken: oldToken, email: 'a@example.test' }),
    );
    mockFetch.mockResolvedValue({ identityToken: newToken });

    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.getIdentity()).toBe(sub);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.test/user/apple-token',
      { method: 'POST', json: { identityToken: oldToken } },
      true,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      STORE_KEY,
      JSON.stringify({
        sub,
        identityToken: newToken,
        email: 'a@example.test',
      }),
    );
    await expect(provider.getBearerToken()).resolves.toBe(
      `apple:Bearer ${newToken}`,
    );
  });

  it('requires explicit sign-in for an expired cached token', async () => {
    const oldToken = makeToken('apple-subject', Date.now() / 1000 - 60);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub: 'apple-subject', identityToken: oldToken }),
    );

    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.hasValidToken()).toBe(false);
    expect(provider.getIdentity()).toBeNull();
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockAppleAuthentication.refreshAsync).not.toHaveBeenCalled();
  });

  it('rejects a missing cached token without returning an empty bearer value', async () => {
    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.getIdentity()).toBeNull();
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('settles readiness after secure-store hydration fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSecureStore.getItemAsync.mockRejectedValue(
      new Error('store unavailable'),
    );

    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    expect(provider.getIdentity()).toBeNull();
    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
  });

  it('propagates network errors without assuming an HTTP response exists', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('network unavailable');
    const token = makeToken('apple-subject', Date.now() / 1000 + 60);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub: 'apple-subject', identityToken: token }),
    );
    mockFetch.mockRejectedValue(networkError);

    const provider = await initializeProvider();

    expect(provider.isReady).toBe(true);
    await expect(provider.getBearerToken()).rejects.toBe(networkError);
    expect(mockAppleAuthentication.refreshAsync).not.toHaveBeenCalled();
  });

  it('requires explicit sign-in after a background renewal gets a 401', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const sub = 'apple-subject';
    const token = makeToken(sub, Date.now() / 1000 + 60);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub, identityToken: token }),
    );
    mockFetch.mockRejectedValue({ response: { status: 401 } });

    const provider = await initializeProvider();

    await expect(provider.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockAppleAuthentication.refreshAsync).not.toHaveBeenCalled();
    expect(mockAppleAuthentication.signInAsync).not.toHaveBeenCalled();
  });

  it('uses the cached subject for explicit Apple recovery after a 401', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const sub = 'apple-subject';
    const oldToken = makeToken(sub, Date.now() / 1000 + 60);
    const refreshedToken = makeToken(sub, Date.now() / 1000 + 3600);
    const serverToken = makeToken(sub, Date.now() / 1000 + 7200);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        sub,
        identityToken: oldToken,
        email: 'a@example.test',
        given_name: 'A',
      }),
    );
    mockFetch
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ identityToken: serverToken });
    mockAppleAuthentication.refreshAsync.mockResolvedValue({
      user: sub,
      identityToken: refreshedToken,
      authorizationCode: 'fresh-code',
    });

    const provider = await initializeProvider();
    await expect(provider.logIn()).resolves.toEqual({
      sub,
      email: 'a@example.test',
      given_name: 'A',
      family_name: undefined,
    });

    expect(mockAppleAuthentication.refreshAsync).toHaveBeenCalledWith(
      expect.objectContaining({ user: sub }),
    );
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://api.example.test/user/apple-token',
      {
        method: 'POST',
        json: {
          identityToken: refreshedToken,
          authorizationCode: 'fresh-code',
        },
      },
      true,
    );
  });

  it('returns null when explicit Apple credential recovery is cancelled', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const sub = 'apple-subject';
    const token = makeToken(sub, Date.now() / 1000 + 60);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub, identityToken: token }),
    );
    mockFetch
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockRejectedValueOnce({ response: { status: 401 } });
    mockAppleAuthentication.refreshAsync.mockRejectedValue({
      code: 'ERR_REQUEST_CANCELED',
    });

    const provider = await initializeProvider();

    await expect(provider.logIn()).resolves.toBeNull();
    expect(mockAppleAuthentication.refreshAsync).toHaveBeenCalledWith(
      expect.objectContaining({ user: sub }),
    );
    expect(mockAppleAuthentication.signInAsync).not.toHaveBeenCalled();
  });

  it('preserves first-sign-in name and email after the server verifies Apple credentials', async () => {
    const sub = 'first-sign-in-subject';
    const signInToken = makeToken(sub, Date.now() / 1000 + 3600);
    const serverToken = makeToken(sub, Date.now() / 1000 + 7200);
    mockAppleAuthentication.signInAsync.mockResolvedValue({
      user: sub,
      email: 'first@example.test',
      fullName: { givenName: 'First', familyName: 'Reporter' },
      identityToken: signInToken,
      authorizationCode: 'first-code',
    });
    mockFetch.mockResolvedValue({ identityToken: serverToken });

    const provider = await initializeProvider();
    await expect(provider.logIn()).resolves.toEqual({
      sub,
      email: 'first@example.test',
      given_name: 'First',
      family_name: 'Reporter',
    });
    expect(provider.getIdentity()).toBe(sub);
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      JSON.stringify({
        sub,
        email: 'first@example.test',
        given_name: 'First',
        family_name: 'Reporter',
        identityToken: serverToken,
      }),
    );
  });

  it('single-flights concurrent near-expiry token requests', async () => {
    const sub = 'apple-subject';
    const oldToken = makeToken(sub, Date.now() / 1000 + 60);
    const newToken = makeToken(sub, Date.now() / 1000 + 3600);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub, identityToken: oldToken }),
    );
    let finishRefresh;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );

    const provider = await initializeProvider();
    const first = provider.getBearerToken();
    const second = provider.getBearerToken();
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    finishRefresh({ identityToken: newToken });
    await expect(Promise.all([first, second])).resolves.toEqual([
      `apple:Bearer ${newToken}`,
      `apple:Bearer ${newToken}`,
    ]);
  });

  it('does not persist a background refresh after logout', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const sub = 'apple-subject';
    const oldToken = makeToken(sub, Date.now() / 1000 + 60);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub, identityToken: oldToken, email: 'a@example.test' }),
    );
    let finishRefresh;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );

    const provider = await initializeProvider();
    await flushPromises();
    await provider.logOut();
    finishRefresh({
      identityToken: makeToken(sub, Date.now() / 1000 + 3600),
    });
    await flushPromises();

    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      JSON.stringify({ sub, identityToken: null, email: 'a@example.test' }),
    );
  });

  it('does not let a background refresh overwrite a different interactive account', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let currentTime = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    const oldToken = makeToken('old-subject', currentTime / 1000 + 1);
    const newSignInToken = makeToken('new-subject', currentTime / 1000 + 7200);
    const newServerToken = makeToken('new-subject', currentTime / 1000 + 10800);
    mockSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ sub: 'old-subject', identityToken: oldToken }),
    );
    let finishOldRefresh;
    mockFetch
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishOldRefresh = resolve;
        }),
      )
      .mockResolvedValueOnce({ identityToken: newServerToken });
    mockAppleAuthentication.signInAsync.mockResolvedValue({
      user: 'new-subject',
      identityToken: newSignInToken,
      email: 'new@example.test',
    });

    const provider = await initializeProvider();
    await flushPromises();
    currentTime += 2000;
    await expect(provider.logIn()).resolves.toMatchObject({
      sub: 'new-subject',
    });

    finishOldRefresh({
      identityToken: makeToken('old-subject', currentTime / 1000 + 3600),
    });
    await flushPromises();

    expect(provider.getIdentity()).toBe('new-subject');
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      expect.stringContaining(newServerToken),
    );
  });

  it('serializes an in-flight token write before logout clears the session', async () => {
    const sub = 'apple-subject';
    const signInToken = makeToken(sub, Date.now() / 1000 + 3600);
    const serverToken = makeToken(sub, Date.now() / 1000 + 7200);
    mockAppleAuthentication.signInAsync.mockResolvedValue({
      user: sub,
      identityToken: signInToken,
    });
    mockFetch.mockResolvedValue({ identityToken: serverToken });
    let finishStorageWrite;
    mockSecureStore.setItemAsync.mockImplementation((_key, value) => {
      if (value.includes(serverToken)) {
        return new Promise((resolve) => {
          finishStorageWrite = resolve;
        });
      }

      return Promise.resolve();
    });

    const provider = await initializeProvider();
    const pendingLogin = provider.logIn();
    await flushPromises();
    expect(finishStorageWrite).toBeDefined();

    const pendingLogout = provider.logOut();
    finishStorageWrite();
    await expect(pendingLogin).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await pendingLogout;

    expect(provider.getIdentity()).toBeNull();
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      JSON.stringify({ sub, identityToken: null }),
    );
  });

  it('does not let delayed hydration overwrite a completed sign-in', async () => {
    const sub = 'new-subject';
    const signInToken = makeToken(sub, Date.now() / 1000 + 3600);
    const serverToken = makeToken(sub, Date.now() / 1000 + 7200);
    let finishHydration;
    mockSecureStore.getItemAsync.mockReturnValue(
      new Promise((resolve) => {
        finishHydration = resolve;
      }),
    );
    mockAppleAuthentication.signInAsync.mockResolvedValue({
      user: sub,
      identityToken: signInToken,
      email: 'new@example.test',
    });
    mockFetch.mockResolvedValue({ identityToken: serverToken });

    renderProvider();
    mockRuntime.effects[0]();
    const provider = renderProvider();
    await expect(provider.logIn()).resolves.toMatchObject({ sub });

    finishHydration(
      JSON.stringify({
        sub: 'old-subject',
        identityToken: makeToken('old-subject', Date.now() / 1000 + 3600),
      }),
    );
    await flushPromises();

    expect(renderProvider().isReady).toBe(true);
    expect(provider.getIdentity()).toBe(sub);
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      expect.stringContaining(serverToken),
    );
  });

  it('does not let a cancelled older sign-in clear a newer session', async () => {
    const sub = 'new-subject';
    const signInToken = makeToken(sub, Date.now() / 1000 + 3600);
    const serverToken = makeToken(sub, Date.now() / 1000 + 7200);
    let cancelOlderSignIn;
    mockAppleAuthentication.signInAsync
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          cancelOlderSignIn = reject;
        }),
      )
      .mockResolvedValueOnce({ user: sub, identityToken: signInToken });
    mockFetch.mockResolvedValue({ identityToken: serverToken });

    const provider = await initializeProvider();
    const olderSignIn = provider.logIn();
    await flushPromises();
    const newerSignIn = provider.logIn();
    await expect(newerSignIn).resolves.toMatchObject({ sub });
    cancelOlderSignIn({ code: 'ERR_REQUEST_CANCELED' });

    await expect(olderSignIn).resolves.toBeNull();
    expect(provider.getIdentity()).toBe(sub);
    expect(mockSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      STORE_KEY,
      expect.stringContaining(serverToken),
    );
  });
});
