import { approveUser, ARCHIVED_USER, checkArchived } from './user_management.js';

describe('approveUser', () => {
  it('throws an error if there is no matching guid in firestore', async () => {
    await expect(async () => {
      await approveUser('badGuid', 'agency');
    }).rejects.toThrow(/invalid/);
  });
});

describe('checkArchived', () => {
  it('completes successfully if no archived prop', () => {
    expect(() => {
      checkArchived({});
    }).not.toThrow();
    expect(() => {
      checkArchived({ archived: false });
    }).not.toThrow();
  });
  it('throws if archived is true', () => {
    try {
      checkArchived({ archived: true });
    } catch (error) {
      expect(error.message).toMatch(/already/);
      expect(error.code).toBe(ARCHIVED_USER);
    }
  });
});
