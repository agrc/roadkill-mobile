let mockRuntime;
let mockSecureStore;
let useSecureRef;

function createHookRuntime() {
  const refs = [];
  let hookIndex = 0;
  const effects = [];

  return {
    beginRender() {
      hookIndex = 0;
    },
    useRef(initialValue) {
      const index = hookIndex++;
      if (!(index in refs)) refs[index] = { current: initialValue };

      return refs[index];
    },
    useEffect(effect) {
      effects.push(effect);
    },
    effects,
  };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.resetModules();
  mockRuntime = createHookRuntime();
  mockSecureStore = {
    ALWAYS: 'ALWAYS',
    getItemAsync: jest.fn().mockResolvedValue(JSON.stringify('stored-value')),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
  };

  jest.doMock('react', () => ({ __esModule: true, default: mockRuntime }));
  jest.doMock('expo-secure-store', () => mockSecureStore);
  jest.doMock('date-fns', () => ({ format: jest.fn() }));
  jest.doMock('expo-application', () => ({ applicationName: 'Roadkill' }));
  jest.doMock('expo-linking', () => ({ openURL: jest.fn() }));
  jest.doMock('expo-mail-composer', () => ({}));
  jest.doMock('react-native', () => ({ Alert: { alert: jest.fn() } }));
  jest.doMock('./config', () => ({ __esModule: true, default: {} }));
  jest.doMock('./localization', () => ({ __esModule: true, default: jest.fn() }));
  useSecureRef = require('./utilities').useSecureRef;
});

describe('useSecureRef readiness', () => {
  it('resolves readiness after restoring the stored value', async () => {
    mockRuntime.beginRender();
    const [ref, , ready] = useSecureRef('AUTH_TOKEN');
    mockRuntime.effects.forEach((effect) => effect());

    expect(ready).toEqual(expect.any(Promise));
    await ready;
    await flushPromises();

    expect(ref.current).toBe('stored-value');
  });

  it('resolves readiness with a safe null value when secure storage fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('storage failed'));

    mockRuntime.beginRender();
    const [ref, , ready] = useSecureRef('AUTH_TOKEN');
    mockRuntime.effects.forEach((effect) => effect());

    await expect(ready).resolves.toBeUndefined();
    expect(ref.current).toBeNull();
  });

  it('does not let a late hydration read overwrite a newer write', async () => {
    let resolveStoredValue;
    mockSecureStore.getItemAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveStoredValue = resolve;
      }),
    );

    mockRuntime.beginRender();
    const [ref, setRef, ready] = useSecureRef('AUTH_TOKEN');
    mockRuntime.effects.forEach((effect) => effect());
    const write = setRef('new-value');
    resolveStoredValue(JSON.stringify('stale-value'));

    await Promise.all([ready, write]);

    expect(ref.current).toBe('new-value');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'AUTH_TOKEN',
      'new-value',
      { keychainAccessible: 'ALWAYS' },
    );
  });
});