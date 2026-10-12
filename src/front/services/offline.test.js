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

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const storageDirectory = 'file:///documents/offlineData';
const recordPath = (id) => `${storageDirectory}/${id}/data.json`;
const originalOwner = {
  providerName: 'google',
  subject: 'original-subject',
  userId: 'original-user',
};
const currentOwner = {
  providerName: 'google',
  subject: 'current-subject',
  userId: 'current-user',
};

let mockRuntime;
let mockFiles;
let mockDirectories;
let mockDeleteAsync;
let mockAlert;
let mockSentry;
let mockApi;
let mockAuth;
let mockInternetReachable;
let mockMutationCalls;
let OfflineCacheContextProvider;

function addQueueEntry(id, value) {
  mockDirectories.add(`${storageDirectory}/${id}`);
  mockFiles.set(recordPath(id), JSON.stringify(value));
}

function renderOfflineCache() {
  mockRuntime.beginRender();
  const tree = OfflineCacheContextProvider({ children: null });

  return tree.props.value;
}

async function initializeOfflineCache() {
  renderOfflineCache();
  mockRuntime.flushEffects();
  await flushPromises();
  const value = renderOfflineCache();
  mockRuntime.flushEffects();
  await flushPromises();
  renderOfflineCache();

  return value;
}

beforeEach(() => {
  jest.resetModules();
  mockRuntime = createHookRuntime();
  mockFiles = new Map();
  mockDirectories = new Set();
  mockDeleteAsync = jest.fn(async (path) => {
    for (const filePath of mockFiles.keys()) {
      if (filePath.startsWith(`${path}/`)) mockFiles.delete(filePath);
    }
    for (const directory of mockDirectories) {
      if (directory === path || directory.startsWith(`${path}/`)) {
        mockDirectories.delete(directory);
      }
    }
  });
  mockAlert = jest.fn();
  mockSentry = { captureException: jest.fn() };
  mockInternetReachable = false;
  mockMutationCalls = 0;
  mockApi = {
    postReport: jest.fn().mockResolvedValue({}),
    postRoute: jest.fn().mockResolvedValue({ route_id: 'route-1' }),
  };
  mockAuth = {
    authInfo: {
      oauthUser: { sub: currentOwner.subject },
      providerName: currentOwner.providerName,
      user: { id: currentOwner.userId },
      registered: true,
    },
    isReady: true,
    getSessionSnapshot: jest.fn(() => ({ generation: 4, owner: currentOwner })),
    getSessionOwner: jest.fn(() => currentOwner),
    getLegacyQueueOwner: jest.fn(() => currentOwner),
    isSessionCurrent: jest.fn((snapshot) => snapshot.generation === 4),
  };

  jest.doMock('react', () => ({
    __esModule: true,
    default: mockRuntime,
    createContext: (...args) => mockRuntime.createContext(...args),
    createElement: (...args) => mockRuntime.createElement(...args),
    useContext: (...args) => mockRuntime.useContext(...args),
    useEffect: (...args) => mockRuntime.useEffect(...args),
    useRef: (...args) => mockRuntime.useRef(...args),
    useState: (...args) => mockRuntime.useState(...args),
  }));
  jest.doMock('react/jsx-runtime', () => ({
    Fragment: 'Fragment',
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  }));
  jest.doMock('prop-types', () => ({
    __esModule: true,
    default: { object: 'object' },
  }));
  jest.doMock('react-native', () => ({
    Alert: { alert: mockAlert },
    Platform: { OS: 'android' },
  }));
  jest.doMock('@react-native-community/netinfo', () => ({
    useNetInfo: () => ({ isInternetReachable: mockInternetReachable }),
  }));
  jest.doMock('@sentry/react-native', () => mockSentry);
  jest.doMock('@tanstack/react-query', () => ({
    useMutation: (options) => ({
      isPending: false,
      mutate: (variables) => {
        mockMutationCalls++;
        return options.mutationFn(variables).then((result) => {
          options.onSuccess?.();

          return result;
        });
      },
    }),
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  }));
  jest.doMock('expo-file-system/legacy', () => ({
    cacheDirectory: 'file:///cache/',
    documentDirectory: 'file:///documents/',
    deleteAsync: mockDeleteAsync,
    getInfoAsync: jest.fn(async (path) => ({
      exists: path.endsWith('/data.json') ? mockFiles.has(path) : true,
    })),
    makeDirectoryAsync: jest.fn(async (path) => {
      mockDirectories.add(path);
    }),
    moveAsync: jest.fn().mockResolvedValue(undefined),
    readAsStringAsync: jest.fn(async (path) => mockFiles.get(path)),
    readDirectoryAsync: jest.fn(async (path) =>
      Array.from(mockDirectories)
        .filter((directory) => directory.startsWith(`${path}/`))
        .map((directory) => directory.slice(path.length + 1))
        .filter((name) => !name.includes('/')),
    ),
    writeAsStringAsync: jest.fn(async (path, value) => {
      mockFiles.set(path, value);
      mockDirectories.add(path.slice(0, path.lastIndexOf('/')));
    }),
  }));
  jest.doMock('expo-notifications', () => ({
    setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('../auth/context', () => ({
    __esModule: true,
    default: () => mockAuth,
  }));
  jest.doMock('./api', () => ({ useAPI: () => mockApi }));
  jest.doMock('./config', () => ({
    __esModule: true,
    default: {
      QUERY_KEYS: { submissions: 'submissions', profile: 'profile' },
      REPORT_TYPES: { report: 'report', pickup: 'pickup' },
    },
  }));
  jest.doMock('./localization', () => ({
    __esModule: true,
    default: (key) => key,
  }));
  jest.doMock('./utilities', () => ({
    isPickupReport: () => false,
  }));

  OfflineCacheContextProvider = require('./offline').OfflineCacheContextProvider;
});

describe('offline submission ownership', () => {
  it('migrates legacy JSON before token acquisition and retains photos on failure', async () => {
    const photoUri = 'file:///documents/offlineData/legacy/deer.jpg';
    addQueueEntry('1001', {
      offlineStorageId: '1001',
      animal_location: { coordinates: [1, 2] },
      photo: { uri: photoUri },
    });
    mockAuth.getLegacyQueueOwner.mockReturnValue(originalOwner);
    mockAuth.getSessionSnapshot.mockReturnValue({
      generation: 4,
      owner: originalOwner,
    });
    mockApi.postReport.mockRejectedValue(
      Object.assign(new Error('service unavailable'), { status: 503 }),
    );

    const offline = await initializeOfflineCache();
    await offline.submitOfflineSubmissions();

    const stored = JSON.parse(mockFiles.get(recordPath('1001')));
    expect(stored.__roadkillOfflineRecord).toBe(1);
    expect(stored.owner).toEqual(originalOwner);
    expect(stored.submission.photo.uri).toBe(photoUri);
    expect(mockApi.postReport).toHaveBeenCalledWith(
      expect.not.objectContaining({ owner: expect.anything() }),
      'report',
      expect.objectContaining({ owner: originalOwner }),
    );
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(mockSentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('skips and preserves a report owned by another app user', async () => {
    const photoUri = 'file:///documents/offlineData/1002/photo.jpg';
    addQueueEntry('1002', {
      __roadkillOfflineRecord: 1,
      owner: originalOwner,
      submission: {
        offlineStorageId: '1002',
        animal_location: { coordinates: [1, 2] },
        photo: { uri: photoUri },
      },
    });

    const offline = await initializeOfflineCache();
    await offline.submitOfflineSubmissions();

    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(JSON.parse(mockFiles.get(recordPath('1002'))).submission.photo.uri).toBe(
      photoUri,
    );
    expect(mockAlert).toHaveBeenCalledWith(
      'services.offline.offlineError',
      'services.offline.ownerMismatch',
    );
  });

  it('manually confirms same-identity reassignment before submitting under the current account', async () => {
    const previousAppOwner = { ...currentOwner, userId: 'previous-app-user' };
    const recordId = '1008';
    addQueueEntry(recordId, {
      __roadkillOfflineRecord: 1,
      owner: previousAppOwner,
      submission: {
        offlineStorageId: recordId,
        animal_location: { coordinates: [1, 2] },
      },
    });
    mockApi.postReport.mockImplementation(async () => {
      expect(JSON.parse(mockFiles.get(recordPath(recordId))).owner).toEqual(
        currentOwner,
      );
      return {};
    });

    const offline = await initializeOfflineCache();
    const submission = offline.submitOfflineSubmissions();
    await flushPromises();

    expect(mockAlert).toHaveBeenCalledWith(
      'services.offline.reassignTitle',
      'services.offline.reassignDescription',
      expect.any(Array),
      expect.any(Object),
    );
    expect(mockApi.postReport).not.toHaveBeenCalled();
    mockAlert.mock.calls[0][2][1].onPress();
    await submission;

    expect(mockApi.postReport).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(`${storageDirectory}/${recordId}`);
  });

  it('keeps same-identity reports and photos when reassignment is canceled', async () => {
    const previousAppOwner = { ...currentOwner, userId: 'previous-app-user' };
    const recordId = '1009';
    const photoUri = `file:///documents/offlineData/${recordId}/photo.jpg`;
    addQueueEntry(recordId, {
      __roadkillOfflineRecord: 1,
      owner: previousAppOwner,
      submission: {
        offlineStorageId: recordId,
        animal_location: { coordinates: [1, 2] },
        photo: { uri: photoUri },
      },
    });

    const offline = await initializeOfflineCache();
    const submission = offline.submitOfflineSubmissions();
    await flushPromises();
    mockAlert.mock.calls[0][2][0].onPress();
    await submission;

    const stored = JSON.parse(mockFiles.get(recordPath(recordId)));
    expect(stored.owner).toEqual(previousAppOwner);
    expect(stored.submission.photo.uri).toBe(photoUri);
    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['provider', { ...currentOwner, providerName: 'apple' }],
    ['subject', { ...currentOwner, subject: 'different-subject' }],
  ])('never claims a queued report with a different %s', async (_identityPart, queuedOwner) => {
    const previousAppOwner = { ...queuedOwner, userId: 'previous-app-user' };
    const recordId = '1010';
    addQueueEntry(recordId, {
      __roadkillOfflineRecord: 1,
      owner: previousAppOwner,
      submission: {
        offlineStorageId: recordId,
        animal_location: { coordinates: [1, 2] },
      },
    });

    const offline = await initializeOfflineCache();
    await offline.submitOfflineSubmissions();

    expect(mockAlert).not.toHaveBeenCalledWith(
      'services.offline.reassignTitle',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(JSON.parse(mockFiles.get(recordPath(recordId))).owner).toEqual(
      previousAppOwner,
    );
    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('does not prompt or reassign a same-identity queue during background submission', async () => {
    const previousAppOwner = { ...currentOwner, userId: 'previous-app-user' };
    const recordId = '1011';
    addQueueEntry(recordId, {
      __roadkillOfflineRecord: 1,
      owner: previousAppOwner,
      submission: {
        offlineStorageId: recordId,
        animal_location: { coordinates: [1, 2] },
      },
    });
    const offline = await initializeOfflineCache();
    mockInternetReachable = true;
    renderOfflineCache();
    mockRuntime.flushEffects();
    await flushPromises();

    expect(mockMutationCalls).toBe(1);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(JSON.parse(mockFiles.get(recordPath(recordId))).owner).toEqual(
      previousAppOwner,
    );
    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(offline).toBeDefined();
  });

  it('does not rewrite ownership or dispatch if the session changes during confirmation', async () => {
    const previousAppOwner = { ...currentOwner, userId: 'previous-app-user' };
    const recordId = '1012';
    addQueueEntry(recordId, {
      __roadkillOfflineRecord: 1,
      owner: previousAppOwner,
      submission: {
        offlineStorageId: recordId,
        animal_location: { coordinates: [1, 2] },
      },
    });
    let currentSnapshot = { generation: 4, owner: currentOwner };
    mockAuth.getSessionSnapshot.mockImplementation(() => currentSnapshot);
    mockAuth.isSessionCurrent.mockImplementation(
      (snapshot) => snapshot === currentSnapshot,
    );

    const offline = await initializeOfflineCache();
    const submission = offline.submitOfflineSubmissions();
    await flushPromises();
    currentSnapshot = {
      generation: 5,
      owner: { providerName: 'apple', subject: 'new-subject', userId: 'new-user' },
    };
    mockAlert.mock.calls[0][2][1].onPress();
    await submission;

    expect(JSON.parse(mockFiles.get(recordPath(recordId))).owner).toEqual(
      previousAppOwner,
    );
    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('resumes submissions for the same app user and deletes only after success', async () => {
    addQueueEntry('1003', {
      __roadkillOfflineRecord: 1,
      owner: currentOwner,
      submission: {
        offlineStorageId: '1003',
        animal_location: { coordinates: [1, 2] },
      },
    });

    const offline = await initializeOfflineCache();
    await offline.submitOfflineSubmissions();

    expect(mockApi.postReport).toHaveBeenCalledTimes(1);
    expect(mockApi.postReport.mock.calls[0][2]).toMatchObject({
      generation: 4,
      owner: currentOwner,
    });
    expect(mockDeleteAsync).toHaveBeenCalledWith(`${storageDirectory}/1003`);
    expect(mockFiles.has(recordPath('1003'))).toBe(false);
  });

  it('requires explicit confirmation before assigning an unknown legacy owner', async () => {
    addQueueEntry('1004', {
      offlineStorageId: '1004',
      animal_location: { coordinates: [1, 2] },
      photo: { uri: 'file:///documents/offlineData/1004/photo.jpg' },
    });
    mockAuth.getLegacyQueueOwner.mockReturnValue(null);

    const offline = await initializeOfflineCache();
    const submission = offline.submitOfflineSubmissions();
    await flushPromises();

    expect(mockAlert).toHaveBeenCalledWith(
      'services.offline.unownedTitle',
      'services.offline.unownedDescription',
      expect.any(Array),
      expect.any(Object),
    );
    expect(mockApi.postReport).not.toHaveBeenCalled();
    mockAlert.mock.calls[0][2][0].onPress();
    await submission;

    expect(mockFiles.has(recordPath('1004'))).toBe(true);
    expect(mockApi.postReport).not.toHaveBeenCalled();
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('submits an unknown-owner report only after confirming its current account', async () => {
    const recordId = '1013';
    addQueueEntry(recordId, {
      offlineStorageId: recordId,
      animal_location: { coordinates: [1, 2] },
    });
    mockAuth.getLegacyQueueOwner.mockReturnValue(null);
    mockApi.postReport.mockImplementation(async () => {
      expect(JSON.parse(mockFiles.get(recordPath(recordId))).owner).toEqual(
        currentOwner,
      );
      return {};
    });

    const offline = await initializeOfflineCache();
    const submission = offline.submitOfflineSubmissions();
    await flushPromises();

    expect(mockAlert).toHaveBeenCalledWith(
      'services.offline.unownedTitle',
      'services.offline.unownedDescription',
      expect.any(Array),
      expect.any(Object),
    );
    mockAlert.mock.calls[0][2][1].onPress();
    await submission;

    expect(mockApi.postReport).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith(`${storageDirectory}/${recordId}`);
  });

  it('does not open alerts or immediately retry after background AUTH_REQUIRED', async () => {
    addQueueEntry('1005', {
      __roadkillOfflineRecord: 1,
      owner: currentOwner,
      submission: {
        offlineStorageId: '1005',
        animal_location: { coordinates: [1, 2] },
      },
    });
    mockInternetReachable = true;
    mockApi.postReport.mockRejectedValue(
      Object.assign(new Error('sign-in required'), { code: 'AUTH_REQUIRED' }),
    );

    await initializeOfflineCache();
    await flushPromises();
    await flushPromises();
    renderOfflineCache();
    mockRuntime.flushEffects();

    expect(mockMutationCalls).toBe(1);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockFiles.has(recordPath('1005'))).toBe(true);
  });

  it('pauses repeated automatic outage retries until connectivity returns', async () => {
    addQueueEntry('1007', {
      __roadkillOfflineRecord: 1,
      owner: currentOwner,
      submission: {
        offlineStorageId: '1007',
        animal_location: { coordinates: [1, 2] },
      },
    });
    mockInternetReachable = true;
    mockApi.postReport.mockRejectedValue(
      Object.assign(new Error('service unavailable'), { status: 503 }),
    );

    await initializeOfflineCache();
    await flushPromises();
    await flushPromises();
    renderOfflineCache();
    mockRuntime.flushEffects();
    await flushPromises();

    expect(mockMutationCalls).toBe(1);
    expect(mockAlert).not.toHaveBeenCalled();

    mockInternetReachable = false;
    renderOfflineCache();
    mockRuntime.flushEffects();
    mockInternetReachable = true;
    renderOfflineCache();
    mockRuntime.flushEffects();
    await flushPromises();
    await flushPromises();

    expect(mockMutationCalls).toBe(2);
    expect(mockFiles.has(recordPath('1007'))).toBe(true);
  });

  it('stops a batch when the session changes during a request and keeps the queue', async () => {
    addQueueEntry('1006', {
      __roadkillOfflineRecord: 1,
      owner: currentOwner,
      submission: {
        offlineStorageId: '1006',
        animal_location: { coordinates: [1, 2] },
      },
    });
    mockApi.postReport.mockImplementation(async (_submission, _type, snapshot) => {
      expect(snapshot.owner).toEqual(currentOwner);
      mockAuth.isSessionCurrent.mockReturnValue(false);
      throw Object.assign(new Error('session changed'), {
        code: 'SESSION_CHANGED',
      });
    });

    const offline = await initializeOfflineCache();
    await offline.submitOfflineSubmissions();

    expect(mockApi.postReport).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(mockFiles.has(recordPath('1006'))).toBe(true);
  });
});