import * as Sentry from '@sentry/react-native';
import CheapRuler from 'cheap-ruler';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import backgroundLocationService from './backgroundLocation';
import config from './config';
import { appendCoordinates } from './utilities';

const DATABASE_NAME = 'vehicleTracking.db';
const SESSION_ID = 1;
const MAX_DATABASE_ATTEMPTS = 3;

export const MAX_TRACKING_DURATION_REASON = 'max-duration';

let databasePromise;
let databaseQueue = Promise.resolve();

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

      try {
        await database.execAsync('PRAGMA busy_timeout = 1000;');
        const journalMode = await database.getFirstAsync(
          'PRAGMA journal_mode = WAL;',
        );
        if (String(journalMode?.journal_mode).toLowerCase() !== 'wal') {
          throw new Error(
            `Unable to enable WAL for vehicle tracking. Returned journal mode: ${journalMode?.journal_mode}.`,
          );
        }

        await database.execAsync(`
        CREATE TABLE IF NOT EXISTS vehicle_tracking_session (
          id INTEGER PRIMARY KEY NOT NULL,
          started_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          pause_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS vehicle_tracking_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          UNIQUE (timestamp, latitude, longitude)
        );
      `);

        return database;
      } catch (error) {
        try {
          await database.closeAsync();
        } catch (closeError) {
          console.error('Unable to close the tracking database:', closeError);
          Sentry.captureException(closeError);
        }
        throw error;
      }
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

function enqueueDatabaseOperation(operation) {
  const pending = databaseQueue.then(async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation(await getDatabase());
      } catch (error) {
        if (
          attempt >= MAX_DATABASE_ATTEMPTS ||
          !/\bdatabase(?: table| schema)? is locked\b/i.test(
            error?.message ?? '',
          )
        ) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
      }
    }
  });
  // Recover the queue tail, but preserve the rejection returned to the caller.
  databaseQueue = pending.then(
    () => undefined,
    () => undefined,
  );

  return pending;
}

async function insertCoordinates(database, coordinates, timestamp) {
  for (const coordinate of coordinates) {
    await database.runAsync(
      `INSERT OR IGNORE INTO vehicle_tracking_points
        (timestamp, latitude, longitude)
        VALUES (?, ?, ?)`,
      coordinate.timestamp ?? timestamp,
      coordinate.latitude,
      coordinate.longitude,
    );
  }
}

export async function beginVehicleTrackingSession(startTime) {
  const startedAt = startTime.getTime();

  await enqueueDatabaseOperation((database) =>
    database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM vehicle_tracking_points');
      await database.runAsync(
        `INSERT OR REPLACE INTO vehicle_tracking_session
        (id, started_at, status, pause_reason)
        VALUES (?, ?, 'tracking', NULL)`,
        SESSION_ID,
        startedAt,
      );
    }),
  );
}

export async function restoreVehicleTrackingSession(
  startTime,
  fallbackStatus,
  routeCoordinates = [],
) {
  const startedAt = startTime.getTime();

  return enqueueDatabaseOperation(async (database) => {
    await database.withTransactionAsync(async () => {
      const session = await database.getFirstAsync(
        'SELECT started_at, status FROM vehicle_tracking_session WHERE id = ?',
        SESSION_ID,
      );

      if (!session || Number(session.started_at) !== startedAt) {
        await database.runAsync('DELETE FROM vehicle_tracking_points');
        await database.runAsync(
          `INSERT OR REPLACE INTO vehicle_tracking_session
          (id, started_at, status, pause_reason)
          VALUES (?, ?, ?, NULL)`,
          SESSION_ID,
          startedAt,
          fallbackStatus,
        );
      }

      const pointCount = await database.getFirstAsync(
        'SELECT COUNT(*) AS count FROM vehicle_tracking_points',
      );

      if (Number(pointCount?.count ?? 0) === 0 && routeCoordinates.length > 0) {
        await insertCoordinates(database, routeCoordinates, startedAt);
      }
    });

    return readVehicleTrackingPoints(database);
  });
}

export async function getVehicleTrackingSession() {
  return enqueueDatabaseOperation((database) =>
    database.getFirstAsync(
      `SELECT started_at, status, pause_reason
      FROM vehicle_tracking_session
      WHERE id = ?`,
      SESSION_ID,
    ),
  );
}

export async function setVehicleTrackingSessionStatus(
  status,
  pauseReason = null,
) {
  return enqueueDatabaseOperation(async (database) => {
    const result = await database.runAsync(
      `UPDATE vehicle_tracking_session
      SET status = ?, pause_reason = ?
      WHERE id = ?`,
      status,
      pauseReason,
      SESSION_ID,
    );

    if (result.changes === 0) {
      throw new Error('No active vehicle-tracking session was found.');
    }
  });
}

export async function clearVehicleTrackingSession() {
  await enqueueDatabaseOperation((database) =>
    database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM vehicle_tracking_points');
      await database.runAsync(
        'DELETE FROM vehicle_tracking_session WHERE id = ?',
        SESSION_ID,
      );
    }),
  );
}

export async function getVehicleTrackingPoints(afterId = 0) {
  return enqueueDatabaseOperation((database) =>
    readVehicleTrackingPoints(database, afterId),
  );
}

function readVehicleTrackingPoints(database, afterId = 0) {
  return database.getAllAsync(
    `SELECT id, timestamp, latitude, longitude
      FROM vehicle_tracking_points
      WHERE id > ?
      ORDER BY id ASC`,
    afterId,
  );
}

async function persistLocationBatch(database, locations) {
  const validLocations = locations
    .filter(
      ({ timestamp, coords }) =>
        Number.isFinite(timestamp) &&
        Number.isFinite(coords?.latitude) &&
        Number.isFinite(coords?.longitude),
    )
    .map(({ timestamp, coords }) => ({
      timestamp,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }))
    .sort((left, right) => left.timestamp - right.timestamp);
  const savedPoints = [];
  let maxTimeReached = false;

  await database.withTransactionAsync(async () => {
    const session = await database.getFirstAsync(
      `SELECT started_at, status
        FROM vehicle_tracking_session
        WHERE id = ?`,
      SESSION_ID,
    );

    if (!session || session.status !== 'tracking') {
      return;
    }

    const lastPoint = await database.getFirstAsync(
      `SELECT id, timestamp, latitude, longitude
        FROM vehicle_tracking_points
        ORDER BY id DESC
        LIMIT 1`,
    );
    const startedAt = Number(session.started_at);
    const lastTimestamp = lastPoint
      ? Number(lastPoint.timestamp)
      : startedAt - 1;
    const candidates = validLocations.filter(
      ({ timestamp }) => timestamp >= startedAt && timestamp > lastTimestamp,
    );
    const currentRoute = lastPoint
      ? [{ latitude: lastPoint.latitude, longitude: lastPoint.longitude }]
      : [];
    const acceptedCoordinates = candidates.length
      ? appendCoordinates(currentRoute, candidates, CheapRuler)
      : [];
    const newCoordinates = lastPoint
      ? acceptedCoordinates.slice(1)
      : acceptedCoordinates;

    for (const coordinate of newCoordinates) {
      const result = await database.runAsync(
        `INSERT OR IGNORE INTO vehicle_tracking_points
          (timestamp, latitude, longitude)
          VALUES (?, ?, ?)`,
        coordinate.timestamp,
        coordinate.latitude,
        coordinate.longitude,
      );

      if (result.changes > 0) {
        savedPoints.push({
          id: result.lastInsertRowId,
          timestamp: coordinate.timestamp,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        });
      }
    }

    maxTimeReached = Date.now() > startedAt + config.MAX_TRACKING_TIME;

    if (maxTimeReached) {
      await database.runAsync(
        `UPDATE vehicle_tracking_session
          SET status = 'paused', pause_reason = ?
          WHERE id = ?`,
        MAX_TRACKING_DURATION_REASON,
        SESSION_ID,
      );
    }
  });

  return { savedPoints, maxTimeReached };
}

export async function flushVehicleTrackingLocationWrites() {
  await databaseQueue;
}

export async function handleVehicleTrackingTask({ data, error }) {
  if (error) {
    console.error('Background vehicle tracking task failed:', error);
    Sentry.captureException(error);

    return;
  }

  const locations = data?.locations;
  if (!locations?.length) return;

  try {
    const { savedPoints, maxTimeReached } = await enqueueDatabaseOperation(
      (database) => persistLocationBatch(database, locations),
    );

    if (maxTimeReached) {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        backgroundLocationService.taskName,
      );
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(
          backgroundLocationService.taskName,
        );
      }
    }

    if (savedPoints.length > 0 || maxTimeReached) {
      backgroundLocationService.notify({ maxTimeReached });
    }
  } catch (taskError) {
    console.error('Unable to persist background vehicle locations:', taskError);
    Sentry.captureException(taskError);
    throw taskError;
  }
}

TaskManager.defineTask(
  backgroundLocationService.taskName,
  handleVehicleTrackingTask,
);
