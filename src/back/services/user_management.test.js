import { report as reportSchema } from 'common/validation/reports.js';
import { describe, expect, it } from 'vitest';
import {
  approveUser,
  checkExpiration,
  EXPIRED_APPROVAL,
  profileUpdateSchema,
  registerSchema,
} from './user_management.js';

describe('text field validation', () => {
  it('rejects comments longer than 512 characters', () => {
    expect(() =>
      reportSchema.validateSyncAt('comments', { comments: 'a'.repeat(513) }),
    ).toThrow();
  });

  it('rejects registration organization names longer than 128 characters', () => {
    expect(() =>
      registerSchema.validateSyncAt('organization.name', {
        organization: { name: 'a'.repeat(129) },
      }),
    ).toThrow();
  });

  it('rejects registration first and last names longer than 25 characters', () => {
    expect(() =>
      registerSchema.validateSyncAt('user.first_name', {
        user: { first_name: 'a'.repeat(26) },
      }),
    ).toThrow();
    expect(() =>
      registerSchema.validateSyncAt('user.last_name', {
        user: { last_name: 'a'.repeat(26) },
      }),
    ).toThrow();
  });

  it('rejects profile organization names longer than 128 characters', () => {
    expect(() =>
      profileUpdateSchema.validateSyncAt('organization_name', {
        organization_name: 'a'.repeat(129),
      }),
    ).toThrow();
  });
});

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
