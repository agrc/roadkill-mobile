import { mock } from 'expo-location';
import { getLocation } from './location';

describe('getLocation', () => {
  it('returns a high accuracy location', async () => {
    mock({
      getCurrentPositionAsync: () => ({
        coords: {
          latitude: 1,
          longitude: 2,
        },
      }),
    });

    const location = await getLocation(5);

    expect(location.coords.latitude).toBe(1);
    expect(location.coords.longitude).toBe(2);
  });

  it('returns the last known position for low accuracy', async () => {
    mock({
      getLastKnownPositionAsync: () => ({
        coords: {
          latitude: 3,
          longitude: 4,
        },
      }),
    });

    const location = await getLocation(2);

    expect(location.coords.latitude).toBe(3);
    expect(location.coords.longitude).toBe(4);
  });

  it('falls back to current position if last known position is not available for lower accuracy', async () => {
    mock({
      getLastKnownPositionAsync: () => null,
      getCurrentPositionAsync: () => ({
        coords: {
          latitude: 3,
          longitude: 4,
        },
      }),
    });

    const location = await getLocation(2);

    expect(location.coords.latitude).toBe(3);
    expect(location.coords.longitude).toBe(4);
  });

  it('handles getCurrentPositionAsync hanging forever on low accuracy', async () => {
    mock({
      getCurrentPositionAsync: () => new Promise(() => {}),
      getLastKnownPositionAsync: () => null,
    });

    const location = await getLocation(2);

    expect(location.coords.latitude).toBe(40.777);
    expect(location.coords.longitude).toBe(-111.888);
  }, 20000);

  it('throws when getCurrentPositionAsync hangs forever on high accuracy', async () => {
    mock({
      getCurrentPositionAsync: () => new Promise(() => {}),
      getLastKnownPositionAsync: () => null,
    });

    expect(getLocation(5)).rejects.toThrow();
  }, 20000);
});
