import { describe, expect, it } from 'vitest';
import { approveUser, checkExpiration, EXPIRED_APPROVAL } from './user_management.js';

describe('approveUser', () => {
  it('throws an error if there is no matching guid in firestore', async () => {
    await expect(async () => {
      await approveUser('badGuid', 'agency');
    }).rejects.toThrow(/invalid/);
  });
});

describe('checkExpiration', () => {
  it('completes successfully date is not expired', () => {
    expect(() => {
      checkExpiration({ approvalExpiration: new Date().getTime() + 1000000 });
    }).not.toThrow();
  });
  it('throws if date is expired', () => {
    try {
      checkExpiration({ approvalExpiration: 1648063677965 }); // Wed Mar 23 2022
    } catch (error) {
      expect(error.message).toMatch(/more than/);
      expect(error.code).toBe(EXPIRED_APPROVAL);
    }
  });
});
