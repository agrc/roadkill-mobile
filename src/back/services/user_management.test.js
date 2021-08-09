import { approveUser, sendApprovalEmail } from './user_management.js';

describe('approveUser', () => {
  it('throws an error if there is no matching quid in firestore', async () => {
    await expect(async () => {
      await approveUser('badGuid', 'agency');
    }).rejects.toThrow(/invalid/);
  });
});
