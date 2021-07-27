import { isAuthenticationExpired } from './google';

describe('isAuthenticationExpired', () => {
  it('checks a future date appropriately', () => {
    const authentication = {
      expiresIn: '3599',
      issuedAt: Date.now() / 1000,
    };

    expect(isAuthenticationExpired(authentication)).toBe(false);
  });
  it('checks an expired date appropriately', () => {
    const authentication = {
      expiresIn: '3599',
      issuedAt: Date.now() / 1000 - 60 * 60,
    };

    expect(isAuthenticationExpired(authentication)).toBe(true);
  });
});
