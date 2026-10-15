const mockState = {
  session: null,
  points: [],
  nextId: 1,
};

const mockBackgroundLocationService = {
  taskName: 'vehicle-tracking-test-task',
  notify: jest.fn(),
};

const mockDatabase = {
  execAsync: jest.fn(async () => {}),
  withTransactionAsync: jest.fn(async (callback) => callback()),
  getFirstAsync: jest.fn(async (sql) => {
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

const {
  beginVehicleTrackingSession,
  handleVehicleTrackingTask,
  getVehicleTrackingPoints,
  getVehicleTrackingSession,
  setVehicleTrackingSessionStatus,
} = require('./vehicleTrackingStorage');
const Location = require('expo-location');

describe('vehicle tracking location persistence', () => {
  beforeEach(() => {
    mockState.session = null;
    mockState.points = [];
    mockState.nextId = 1;
    mockBackgroundLocationService.notify.mockClear();
    Location.stopLocationUpdatesAsync.mockClear();
  });

  it('persists simplified points even when no screen is subscribed', async () => {
    const startedAt = new Date(Date.now() - 5000);
    await beginVehicleTrackingSession(startedAt);

    await handleVehicleTrackingTask({
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

    const points = await getVehicleTrackingPoints();
    expect(points).toHaveLength(2);
    expect(points.map(({ longitude }) => longitude)).toEqual([0, 0.0002]);
    expect(mockBackgroundLocationService.notify).toHaveBeenCalledWith({
      maxTimeReached: false,
    });
  });

  it('ignores location batches after a route has been paused', async () => {
    await beginVehicleTrackingSession(new Date(Date.now() - 1000));
    await setVehicleTrackingSessionStatus('paused');

    await handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: Date.now(),
            coords: { latitude: 40, longitude: -111 },
          },
        ],
      },
    });

    expect(await getVehicleTrackingPoints()).toEqual([]);
    expect(mockBackgroundLocationService.notify).not.toHaveBeenCalled();
  });

  it('automatically pauses and stops updates after the maximum route duration', async () => {
    const startedAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
    await beginVehicleTrackingSession(startedAt);

    await handleVehicleTrackingTask({
      data: {
        locations: [
          {
            timestamp: Date.now(),
            coords: { latitude: 40, longitude: -111 },
          },
        ],
      },
    });

    expect((await getVehicleTrackingSession()).status).toBe('paused');
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
      mockBackgroundLocationService.taskName,
    );
    expect(mockBackgroundLocationService.notify).toHaveBeenCalledWith({
      maxTimeReached: true,
    });
  });
});
