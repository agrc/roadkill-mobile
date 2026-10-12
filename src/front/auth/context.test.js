function createHookRuntime() {
  const states = [];
  const refs = [];
  const effectDependencies = [];
  let hookIndex = 0;
  let queuedEffects = [];

  return {
    beginRender() {
      hookIndex = 0;
      queuedEffects = [];
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
    useRef(initialValue) {
      const index = hookIndex++;
      if (!(index in refs)) refs[index] = { current: initialValue };

      return refs[index];
    },
    useEffect(effect, dependencies) {
      const index = hookIndex++;
      const previous = effectDependencies[index];
      const changed =
        !previous ||
        !dependencies ||
        dependencies.some((value, dependencyIndex) =>
          Object.is(value, previous[dependencyIndex]) === false,
        );

      if (changed) {
        effectDependencies[index] = dependencies;
        queuedEffects.push(effect);
      }
    },
    flushEffects() {
      const effects = queuedEffects;
      queuedEffects = [];
      effects.forEach((effect) => effect());
    },
    createContext() {
      return { Provider: { name: 'Provider' } };
    },
    createElement(type, props, children) {
      return { type, props: { ...props, children } };
    },
    useContext() {
      return null;
    },
  };
}

const makeProvider = (providerName) => ({
  logIn: jest.fn().mockResolvedValue({
    sub: `${providerName}-subject`,
    email: 'user@example.test',
  }),
  logOut: jest.fn().mockResolvedValue(undefined),
  getBearerToken: jest
    .fn()
    .mockResolvedValue(`${providerName}:Bearer access-token`),
  getIdentity: jest.fn(() => `${providerName}-subject`),
  hasValidToken: jest.fn(() => true),
  isReady: true,
});

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

let mockRuntime;
let mockSecureValues;
let mockProviders;
let mockFetch;
let mockOnReady;
let AuthContextProvider;

function renderAuthContext() {
  mockRuntime.beginRender();
  const tree = AuthContextProvider({ children: null, onReady: mockOnReady });

  return tree.props.value;
}

async function initializeAuthContext() {
  renderAuthContext();
  mockRuntime.flushEffects();
  await flushPromises();
  const value = renderAuthContext();
  mockRuntime.flushEffects();

  return { ...value };
}

beforeEach(() => {
  jest.resetModules();
  mockRuntime = createHookRuntime();
  mockSecureValues = {};
  mockProviders = {
    apple: makeProvider('apple'),
    facebook: makeProvider('facebook'),
    google: makeProvider('google'),
    utahid: makeProvider('utahid'),
  };
  mockFetch = jest.fn().mockResolvedValue({
    user: { id: 'new-user' },
    registered: true,
    constants: {},
  });
  mockOnReady = jest.fn();

  jest.doMock('react', () => ({ __esModule: true, default: mockRuntime }));
  jest.doMock('react/jsx-runtime', () => ({
    Fragment: 'Fragment',
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  }));
  jest.doMock('prop-types', () => ({
    __esModule: true,
    default: { object: 'object', func: 'func' },
  }));
  jest.doMock('common/config', () => ({
    __esModule: true,
    default: {
      authProviderNames: {
        apple: 'apple',
        facebook: 'facebook',
        google: 'google',
        utahid: 'utahid',
      },
      versionHeaderName: 'x-api-version',
      apiVersion: '1',
    },
  }));
  jest.doMock('expo-secure-store', () => ({
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('expo-web-browser', () => ({
    warmUpAsync: jest.fn(),
    coolDownAsync: jest.fn(),
  }));
  jest.doMock('@sentry/react-native', () => ({
    captureException: jest.fn(),
  }));
  jest.doMock('react-native', () => ({
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios' },
  }));
  jest.doMock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ clear: jest.fn() }),
  }));
  jest.doMock('../services/config', () => ({
    __esModule: true,
    default: {
      API: 'https://api.example.test',
      USER_STORE_KEY: 'USER_INFO',
      USER_TYPE_KEY: 'USER_TYPE',
      USER_TYPES: { public: 'reporter' },
    },
  }));
  jest.doMock('../services/constants', () => ({ updateConstants: jest.fn() }));
  jest.doMock('../services/fetch', () => ({
    __esModule: true,
    default: mockFetch,
  }));
  jest.doMock('../services/utilities', () => ({
    useSecureState(key, defaultValue) {
      const [value, setValue] = mockRuntime.useState(undefined);
      mockRuntime.useEffect(() => {
        setValue(
          Object.hasOwn(mockSecureValues, key)
            ? mockSecureValues[key]
            : (defaultValue ?? null),
        );
      }, [key]);

      return [
        value,
        (nextValue) => {
          mockSecureValues[key] = nextValue;
          setValue(nextValue);
        },
      ];
    },
  }));
  jest.doMock('./providers/apple', () => ({
    __esModule: true,
    default: () => mockProviders.apple,
  }));
  jest.doMock('./providers/facebook', () => ({
    __esModule: true,
    default: () => mockProviders.facebook,
  }));
  jest.doMock('./providers/google', () => ({
    __esModule: true,
    default: () => mockProviders.google,
  }));
  jest.doMock('./providers/utahid', () => ({
    __esModule: true,
    default: () => mockProviders.utahid,
  }));

  AuthContextProvider = require('./context').AuthContextProvider;
});

describe('AuthContextProvider session recovery', () => {
  it('waits for secure-state hydration and the active provider before readiness', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'saved-subject' },
      providerName: 'utahid',
      user: { id: 'saved-user' },
      registered: true,
    };
    mockProviders.utahid.isReady = false;

    await initializeAuthContext();

    expect(mockOnReady).not.toHaveBeenCalled();

    mockProviders.utahid.isReady = true;
    renderAuthContext();
    mockRuntime.flushEffects();

    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });

  it('preserves signed-out startup and rejects authenticated access without prompting', async () => {
    const auth = await initializeAuthContext();

    expect(mockOnReady).toHaveBeenCalledTimes(1);
    expect(auth.authInfo).toBeNull();
    await expect(auth.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockProviders.google.logIn).not.toHaveBeenCalled();
  });

  it('keeps the prior session intact when explicit sign-in is canceled', async () => {
    const originalInfo = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    mockSecureValues.USER_INFO = originalInfo;
    mockProviders.google.logIn.mockResolvedValue(null);

    const auth = await initializeAuthContext();
    await expect(auth.logIn('google')).resolves.toMatchObject({
      success: false,
      cancelled: true,
    });

    expect(mockSecureValues.USER_INFO).toEqual(originalInfo);
    expect(auth.getSessionOwner()).toMatchObject({ subject: 'google-subject' });
  });

  it('retains a legacy queue owner across same-subject reauthentication', async () => {
    const originalInfo = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    mockSecureValues.USER_INFO = originalInfo;
    mockFetch.mockResolvedValue({
      user: { id: 'existing-user' },
      registered: true,
      constants: {},
    });

    const auth = await initializeAuthContext();
    await auth.logIn('google');

    expect(auth.getSessionOwner()).toMatchObject({
      subject: 'google-subject',
      userId: 'existing-user',
    });
    expect(auth.getLegacyQueueOwner()).toMatchObject({
      subject: 'google-subject',
      userId: 'existing-user',
    });
  });

  it('keeps legacy reports with the prior app user when a mapping is replaced', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'old-user' },
      registered: true,
    };
    mockFetch.mockResolvedValue({
      user: { id: 'replacement-user' },
      registered: true,
      constants: {},
    });

    const auth = await initializeAuthContext();
    await auth.logIn('google');

    expect(auth.getSessionOwner()).toMatchObject({ userId: 'replacement-user' });
    expect(auth.getLegacyQueueOwner()).toMatchObject({ userId: 'old-user' });
  });

  it('reconciles a changed provider subject before returning a background token', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'old-subject' },
      providerName: 'google',
      user: { id: 'old-user' },
      registered: true,
    };
    mockProviders.google.getIdentity.mockReturnValue('new-subject');
    mockFetch.mockResolvedValue({
      user: { id: 'new-user' },
      registered: true,
      constants: {},
    });

    const auth = await initializeAuthContext();
    await expect(auth.getBearerToken()).resolves.toBe(
      'google:Bearer access-token',
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.test/user/login',
      expect.objectContaining({
        json: expect.objectContaining({ auth_id: 'new-subject' }),
      }),
      true,
    );
    expect(auth.getSessionOwner()).toMatchObject({
      subject: 'new-subject',
      userId: 'new-user',
    });
    expect(auth.getLegacyQueueOwner()).toMatchObject({
      subject: 'old-subject',
      userId: 'old-user',
    });
  });

  it.each(['explicit sign-in', 'background token acquisition'])(
    'rejects a missing verified identity during %s',
    async (flow) => {
      mockSecureValues.USER_INFO = {
        oauthUser: { sub: 'cached-subject' },
        providerName: 'google',
        user: { id: 'existing-user' },
        registered: true,
      };
      mockProviders.google.getIdentity.mockReturnValue(null);

      const auth = await initializeAuthContext();
      const acquireIdentity =
        flow === 'explicit sign-in'
          ? auth.logIn('google')
          : auth.getBearerToken();

      await expect(acquireIdentity).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSecureValues.USER_INFO.oauthUser.sub).toBe('cached-subject');
    },
  );

  it('rejects an offline waiter that shared token acquisition across an account switch', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'old-subject' },
      providerName: 'google',
      user: { id: 'old-user' },
      registered: true,
    };
    mockProviders.google.getIdentity.mockReturnValue('new-subject');
    let resolveToken;
    mockProviders.google.getBearerToken.mockReturnValue(
      new Promise((resolve) => {
        resolveToken = resolve;
      }),
    );

    const auth = await initializeAuthContext();
    const expectedSession = auth.getSessionSnapshot();
    const unboundRequest = auth.getBearerToken();
    const queuedRequest = auth.getBearerToken(expectedSession);
    resolveToken('google:Bearer access-token');

    await expect(unboundRequest).resolves.toBe('google:Bearer access-token');
    await expect(queuedRequest).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(mockProviders.google.getBearerToken).toHaveBeenCalledTimes(1);
  });

  it('routes a missing mapping into registration after explicit sign-in', async () => {
    mockProviders.google.getIdentity.mockReturnValue('unregistered-subject');
    mockFetch.mockResolvedValueOnce({ user: null, registered: false, constants: {} });

    const auth = await initializeAuthContext();
    await expect(auth.logIn('google')).resolves.toMatchObject({
      success: true,
      registered: false,
    });
    expect(mockSecureValues.USER_INFO).toMatchObject({
      sessionRecovery: 'registration',
      oauthUser: { sub: 'unregistered-subject' },
    });

    mockFetch.mockResolvedValueOnce({ newUser: { id: 'registered-user' } });
    await auth.registerUser({ user: { auth_id: 'unregistered-subject' } });
    expect(mockSecureValues.USER_INFO).toMatchObject({
      registered: true,
      sessionRecovery: null,
      user: { id: 'registered-user' },
    });
  });

  it('does not prompt on background AUTH_REQUIRED and marks recovery instead', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    const authError = Object.assign(new Error('sign-in required'), {
      code: 'AUTH_REQUIRED',
    });
    mockProviders.google.getBearerToken.mockRejectedValue(authError);

    const auth = await initializeAuthContext();
    await expect(auth.getBearerToken()).rejects.toBe(authError);

    expect(mockProviders.google.logIn).not.toHaveBeenCalled();
    expect(mockSecureValues.USER_INFO.sessionRecovery).toBe('sign-in');
    expect(mockSecureValues.USER_INFO.oauthUser.sub).toBe('google-subject');
  });

  it('rejects an empty authorization header before any API fetch', async () => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    mockProviders.google.getBearerToken.mockResolvedValue('google:Bearer ');

    const auth = await initializeAuthContext();
    await expect(auth.getBearerToken()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, { error: 'invalid_token' }, 'sign-in'],
    [403, { error: 'registration_required' }, 'registration'],
  ])('persists recovery for current structured HTTP %i responses', async (status, data, reason) => {
    mockSecureValues.USER_INFO = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    const auth = await initializeAuthContext();
    const snapshot = auth.getSessionSnapshot();

    expect(auth.handleAPIError({ status, data }, snapshot)).toBe(true);
    expect(mockSecureValues.USER_INFO.sessionRecovery).toBe(reason);
  });

  it('leaves recovery state unchanged for a server outage', async () => {
    const originalInfo = {
      oauthUser: { sub: 'google-subject' },
      providerName: 'google',
      user: { id: 'existing-user' },
      registered: true,
    };
    mockSecureValues.USER_INFO = originalInfo;
    const auth = await initializeAuthContext();

    expect(
      auth.handleAPIError(
        { status: 503, data: { error: 'service_unavailable' } },
        auth.getSessionSnapshot(),
      ),
    ).toBe(false);
    expect(mockSecureValues.USER_INFO).toEqual(originalInfo);
  });
});