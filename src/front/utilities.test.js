import { isTokenExpired } from './utilities';

describe('isTokenExpired', () => {
  it('correctly checks a future date', () => {
    const decodedToken = {
      exp: Date.now() / 1000 + 60,
    };

    expect(isTokenExpired(decodedToken)).toBe(false);
  });
  it('correctly checks a past date', () => {
    const decodedToken = {
      exp: Date.now() / 1000 - 60,
    };

    expect(isTokenExpired(decodedToken)).toBe(true);
  });
  it('throws error if an encoded token is passed', () => {
    const encodedToken = 'blah';

    expect(() => isTokenExpired(encodedToken)).toThrow();
  });
});
