import {
  extentStringToRegion,
  getReleaseChannelBranch,
  isTokenExpired,
  lineCoordinatesToString,
  lineStringToCoordinates,
  pointCoordinatesToString,
  pointStringToCoordinates,
  wrapAsyncWithDelay,
} from './utilities';

describe('isTokenExpired', () => {
  it('correctly checks a future date', () => {
    const decodedToken = {
      exp: Date.now() / 1000 + 60 * 60,
    };

    expect(isTokenExpired(decodedToken)).toBe(false);
  });
  it('correctly checks a past date', () => {
    const decodedToken = {
      exp: Date.now() / 1000 - 60 * 60,
    };

    expect(isTokenExpired(decodedToken)).toBe(true);
  });
  it('throws error if an encoded token is passed', () => {
    const encodedToken = 'blah';

    expect(() => isTokenExpired(encodedToken)).toThrow();
  });
  it('can handle a null token', () => {
    expect(isTokenExpired(undefined)).toBe(true);
  });
});

describe('wrapAsyncWithDelay', () => {
  it('calls the pre and post in normal execution', async () => {
    const action = () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(true), 110);
      });
    const pre = jest.fn();
    const post = jest.fn();

    await wrapAsyncWithDelay(action, pre, post, 100);

    expect(pre).toHaveBeenCalled();
    expect(post).toHaveBeenCalled();
  });
  it('does not call pre if the execution time is less than the delay', async () => {
    const action = () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(true), 50);
      });
    const pre = jest.fn();
    const post = jest.fn();

    await wrapAsyncWithDelay(action, pre, post, 100);

    expect(pre).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalled();
  });
  it('calls pre and post even if it throws', async () => {
    const action = () =>
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('test'));
        }, 110);
      });
    const pre = jest.fn();
    const post = jest.fn();

    await wrapAsyncWithDelay(action, pre, post, 100);

    expect(pre).toHaveBeenCalled();
    expect(post).toHaveBeenCalled();
  });
});

describe('getReleaseChannelBranch', () => {
  it('returns the correct branch name', () => {
    expect(getReleaseChannelBranch('production-v3.0.0')).toBe('production');
  });
});

describe('pointCoordinatesToString', () => {
  it('returns the appropriate string', () => {
    const coordinates = {
      longitude: -1,
      latitude: 2,
    };

    expect(pointCoordinatesToString(coordinates)).toBe('-1 2');
  });
  it('returns null if null is passed', () => {
    expect(pointCoordinatesToString(null)).toBe(null);
  });
});

describe('pointStringToCoordinates', () => {
  it('returns the appropriate object', () => {
    const input = '-1 2';

    const output = pointStringToCoordinates(input);

    expect(output.longitude).toBe(-1);
    expect(output.latitude).toBe(2);
  });
});

describe('lineCoordinatesToString', () => {
  it('returns the appropriate string', () => {
    const line = [
      {
        longitude: -1,
        latitude: 2,
      },
      {
        longitude: -3,
        latitude: 4,
      },
    ];

    expect(lineCoordinatesToString(line)).toBe('-1 2, -3 4');
  });
});

describe('lineStringToCoordinates', () => {
  it('returns the appropriate data', () => {
    const lineString = 'LINESTRING(-1 2,-3 4)';

    const result = lineStringToCoordinates(lineString);

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ longitude: -1, latitude: 2 });
  });
});

describe('extentStringToRegion', () => {
  it('returns the appropriate data', () => {
    const minx = -5;
    const maxx = -2;
    const miny = 1;
    const maxy = 3;
    const extentString = `POLYGON((${minx} ${miny},${minx} ${maxy},${maxx} ${maxy},${maxx} ${miny},${minx} ${miny}))`;

    const result = extentStringToRegion(extentString);

    expect(result.latitude).toBe(2);
    expect(result.longitude).toBe(-3.5);
    expect(result.latitudeDelta).toBe(2);
    expect(result.longitudeDelta).toBe(3);
  });
});