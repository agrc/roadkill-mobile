const mockState = {
  session: null,
  points: [],
  nextId: 1,
  inTransaction: false,
};

const mockBackgroundLocationService = {
  taskName: 'vehicle-tracking-test-task',
  notify: jest.fn(),
};

const mockDatabase = {
  execAsync: jest.fn(async () => {}),
  closeAsync: jest.fn(async () => {}),
  withTransactionAsync: jest.fn(async (callback) => {
    if (mockState.inTransaction) {
      throw new Error('cannot start a transaction within a transaction');
    }

    const snapshot = JSON.parse(JSON.stringify(mockState));
    mockState.inTransaction = true;
    try {
      await callback();
    } catch (error) {
      Object.assign(mockState, snapshot);
      throw error;
    } finally {
      mockState.inTransaction = false;
    }
  }),
  getFirstAsync: jest.fn(async (sql) => {
    if (sql.includes('PRAGMA journal_mode')) {
      return { journal_mode: 'wal' };
    }

    if (sql.includes('COUNT(*)')) {
      return { count: mockState.points.length };
    }

    if (sql.includes('vehicle_tracking_session')) {
      return mockState.session;
    }

    if (sql.includes('ORDER BY id DESC')) {
      return [...mockState.points].sort((a, b) => b.id - a.id)[0] ?? null;
    }

    return null;
  }),
  getAllAsync: jest.fn(async (_sql, afterId) =>
    mockState.points
      .filter((point) => point.id > afterId)
      .sort((a, b) => a.id - b.id),
  ),
  runAsync: jest.fn(async (sql, ...params) => {
    if (sql.includes('DELETE FROM vehicle_tracking_points')) {
      mockState.points = [];

      return { changes: 1 };
    }

    if (sql.includes('DELETE FROM vehicle_tracking_session')) {
      mockState.session = null;

      return { changes: 1 };
    }

    if (sql.includes('INSERT OR REPLACE INTO vehicle_tracking_session')) {
      const trackingIsLiteral = sql.includes("'tracking'");
      mockState.session = {
        started_at: params[1],
        status: trackingIsLiteral ? 'tracking' : params[2],
        pause_reason: null,
      };

      return { changes: 1 };
    }

    if (sql.includes("SET status = 'paused'")) {
      mockState.session.status = 'paused';
      mockState.session.pause_reason = params[0];

      return { changes: 1 };
    }

    if (sql.includes('UPDATE vehicle_tracking_session')) {
      mockState.session.status = params[0];
      mockState.session.pause_reason = params[1];

      return { changes: 1 };
    }

    if (sql.includes('INSERT OR IGNORE INTO vehicle_tracking_points')) {
      const [timestamp, latitude, longitude] = params;
      const duplicate = mockState.points.some(
        (point) =>
          point.timestamp === timestamp &&
          point.latitude === latitude &&
          point.longitude === longitude,
      );

      if (duplicate) {
        return { changes: 0, lastInsertRowId: 0 };
      }

      const point = {
        id: mockState.nextId++,
        timestamp,
        latitude,
        longitude,
      };
      mockState.points.push(point);

      return { changes: 1, lastInsertRowId: point.id };
    }

    throw new Error(`Unexpected SQL in test: ${sql}`);
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDatabase),
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));
jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(async () => true),
  stopLocationUpdatesAsync: jest.fn(async () => {}),
}));
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
jest.mock('./backgroundLocation', () => ({
  __esModule: true,
  default: mockBackgroundLocationService,
}));

let storage;
let Location;
let SQLite;
let Sentry;

describe('vehicle tracking location persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      storage = require('./vehicleTrackingStorage');
      Location = require('expo-location');
      SQLite = require('expo-sqlite');
      Sentry = require('@sentry/react-native');
    });
    mockState.session = null;
    mockState.points = [];
    mockState.nextId = 1;
    mockState.inTransaction = false;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('persists simplified points even when no screen is subscribed', async () => {
    const startedAt = new Date(Date.now() - 5000);
    await storage.beginVehicleTrackingSession(startedAt);

    await storage.handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: startedAt.getTime() + 1000,
            coords: { latitude: 0, longitude: 0 },
          },
          {
            timestamp: startedAt.getTime() + 2000,
            coords: { latitude: 0, longitude: 0.0001 },
          },
          {
            timestamp: startedAt.getTime() + 3000,
            coords: { latitude: 0, longitude: 0.0002 },
          },
        ],
      },
    });

    const points = await storage.getVehicleTrackingPoints();
    expect(points).toHaveLength(2);
    expect(points.map(({ longitude }) => longitude)).toEqual([0, 0.0002]);
    expect(mockBackgroundLocationService.notify).toHaveBeenCalledWith({
      maxTimeReached: false,
    });
  });

  it('ignores location batches after a route has been paused', async () => {
    await storage.beginVehicleTrackingSession(new Date(Date.now() - 1000));
    await storage.setVehicleTrackingSessionStatus('paused');

    await storage.handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: Date.now(),
            coords: { latitude: 40, longitude: -111 },
          },
        ],
      },
    });

    expect(await storage.getVehicleTrackingPoints()).toEqual([]);
    expect(mockBackgroundLocationService.notify).not.toHaveBeenCalled();
  });

  it('automatically pauses and stops updates after the maximum route duration', async () => {
    const startedAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
    await storage.beginVehicleTrackingSession(startedAt);

    await storage.handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: Date.now(),
            coords: { latitude: 40, longitude: -111 },
          },
        ],
      },
    });

    expect((await storage.getVehicleTrackingSession()).status).toBe('paused');
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
      mockBackgroundLocationService.taskName,
    );
    expect(mockBackgroundLocationService.notify).toHaveBeenCalledWith({
      maxTimeReached: true,
    });
  });

  it('allows background writes while another connection reads the saved route', async () => {
    const { DatabaseSync } = require('node:sqlite');
    const { mkdtempSync, rmSync } = require('node:fs');
    const { tmpdir } = require('node:os');
    const { join } = require('node:path');
    const directory = mkdtempSync(join(tmpdir(), 'vehicle-tracking-'));
    const filename = join(directory, 'tracking.db');
    const database = new DatabaseSync(filename);
    const reader = new DatabaseSync(filename);
    SQLite.openDatabaseAsync.mockResolvedValueOnce({
      execAsync: async (sql) => database.exec(sql),
      getFirstAsync: async (sql, ...params) =>
        database.prepare(sql).get(...params) ?? null,
      getAllAsync: async (sql, ...params) =>
        database.prepare(sql).all(...params),
      runAsync: async (sql, ...params) => database.prepare(sql).run(...params),
      closeAsync: async () => database.close(),
      withTransactionAsync: async (callback) => {
        database.exec('BEGIN');
        try {
          await callback();
          database.exec('COMMIT');
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      },
    });

    try {
      const startedAt = new Date(Date.now() - 1000);
      await storage.beginVehicleTrackingSession(startedAt);
      const count = () =>
        reader
          .prepare('SELECT COUNT(*) AS count FROM vehicle_tracking_points')
          .get().count;
      reader.exec('BEGIN');
      expect(count()).toBe(0);

      await storage.handleVehicleTrackingTask({
        data: {
          locations: [
            {
              timestamp: startedAt.getTime() + 500,
              coords: { latitude: 40, longitude: -111 },
            },
          ],
        },
      });

      expect(await storage.getVehicleTrackingPoints()).toHaveLength(1);
      expect(count()).toBe(0);
      reader.exec('COMMIT');
      expect(count()).toBe(1);
    } finally {
      reader.close();
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects a database that did not enable WAL and can initialize again', async () => {
    mockDatabase.getFirstAsync.mockResolvedValueOnce({
      journal_mode: 'delete',
    });

    await expect(storage.getVehicleTrackingSession()).rejects.toThrow(
      'Unable to enable WAL for vehicle tracking. Returned journal mode: delete.',
    );
    expect(mockDatabase.closeAsync).toHaveBeenCalledTimes(1);

    await storage.beginVehicleTrackingSession(new Date());
    expect((await storage.getVehicleTrackingSession()).status).toBe('tracking');
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('retries a locked initialization after closing the failed connection', async () => {
    jest.useFakeTimers();
    mockDatabase.getFirstAsync.mockRejectedValueOnce(
      new Error('database is locked'),
    );
    const pending = storage.beginVehicleTrackingSession(new Date());
    await jest.runAllTimersAsync();
    await pending;

    expect(mockDatabase.closeAsync).toHaveBeenCalledTimes(1);
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(2);
    expect((await storage.getVehicleTrackingSession()).status).toBe('tracking');
  });

  it('orders session changes and reads after a pending background transaction', async () => {
    const startedAt = new Date(Date.now() - 1000);
    await storage.beginVehicleTrackingSession(startedAt);
    let release;
    let entered;
    const blocked = new Promise((resolve) => {
      release = resolve;
    });
    const transactionStarted = new Promise((resolve) => {
      entered = resolve;
    });
    const runAsync = mockDatabase.runAsync.getMockImplementation();
    mockDatabase.runAsync.mockImplementationOnce(async (...args) => {
      entered();
      await blocked;
      return runAsync(...args);
    });

    const pendingWrite = storage.handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: startedAt.getTime() + 500,
            coords: { latitude: 40, longitude: -111 },
          },
        ],
      },
    });
    await transactionStarted;
    const restore = storage.restoreVehicleTrackingSession(
      startedAt,
      'tracking',
    );
    const pause = storage.setVehicleTrackingSessionStatus('paused');
    const session = storage.getVehicleTrackingSession();
    const points = storage.getVehicleTrackingPoints();
    const clear = storage.clearVehicleTrackingSession();
    const flush = storage.flushVehicleTrackingLocationWrites();
    let flushed = false;
    flush.then(() => {
      flushed = true;
    });
    const readsBeforeRelease = mockDatabase.getAllAsync.mock.calls.length;
    await Promise.resolve();
    expect(mockState.session.status).toBe('tracking');
    expect(mockDatabase.getAllAsync).toHaveBeenCalledTimes(readsBeforeRelease);
    expect(flushed).toBe(false);

    release();
    await Promise.all([pendingWrite, pause, clear, flush]);
    expect(flushed).toBe(true);
    expect(await restore).toHaveLength(1);
    expect((await session).status).toBe('paused');
    expect(await points).toHaveLength(1);
    expect(await storage.getVehicleTrackingSession()).toBeNull();
    expect(await storage.getVehicleTrackingPoints()).toEqual([]);
  });

  it('retries the whole batch after rollback without losing or duplicating points', async () => {
    jest.useFakeTimers();
    const startedAt = new Date(Date.now() - 5000);
    await storage.beginVehicleTrackingSession(startedAt);
    const runAsync = mockDatabase.runAsync.getMockImplementation();
    mockDatabase.runAsync
      .mockImplementationOnce(runAsync)
      .mockRejectedValueOnce(new Error('database is locked'));
    const pending = storage.handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: startedAt.getTime() + 1000,
            coords: { latitude: 40, longitude: -111 },
          },
          {
            timestamp: startedAt.getTime() + 2000,
            coords: { latitude: 40, longitude: -111.001 },
          },
        ],
      },
    });
    await jest.runAllTimersAsync();
    await pending;

    expect(await storage.getVehicleTrackingPoints()).toHaveLength(2);
    expect(mockBackgroundLocationService.notify).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it.each(['database is locked', 'disk I/O error'])(
    'surfaces %s without poisoning the queue',
    async (message) => {
      jest.useFakeTimers();
      await storage.beginVehicleTrackingSession(new Date(Date.now() - 1000));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error(message);
      const attempts = message === 'database is locked' ? 3 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        mockDatabase.withTransactionAsync.mockRejectedValueOnce(error);
      }
      const pending = storage.handleVehicleTrackingTask({
        data: {
          locations: [
            {
              timestamp: Date.now(),
              coords: { latitude: 40, longitude: -111 },
            },
          ],
        },
      });
      const rejection = expect(pending).rejects.toBe(error);
      await jest.runAllTimersAsync();
      await rejection;

      expect(mockDatabase.withTransactionAsync).toHaveBeenCalledTimes(
        1 + attempts,
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(mockBackgroundLocationService.notify).not.toHaveBeenCalled();
      await storage.clearVehicleTrackingSession();
      expect(await storage.getVehicleTrackingSession()).toBeNull();
    },
  );
});
