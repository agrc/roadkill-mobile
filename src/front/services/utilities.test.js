import {
  coordinatesToString,
  getReleaseChannelBranch,
  isTokenExpired,
  stringToCoordinates,
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

describe('coordinatesToString', () => {
  it('returns the appropriate string', () => {
    const coordinates = {
      longitude: -1,
      latitude: 2,
    };

    expect(coordinatesToString(coordinates)).toBe('-1 2');
  });
  it('returns null if null is passed', () => {
    expect(coordinatesToString(null)).toBe(null);
  });
});

describe('stringToCoordinates', () => {
  it('returns the appropriate object', () => {
    const input = '-1 2';

    const output = stringToCoordinates(input);

    expect(output.longitude).toBe(-1);
    expect(output.latitude).toBe(2);
  });
});
