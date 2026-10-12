import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFirestore } = vi.hoisted(() => ({
  mockFirestore: {
    doc: vi.fn(),
    runTransaction: vi.fn(),
  },
}));

vi.mock('./clients.js', () => ({ firestore: mockFirestore }));

import {
  cacheAppleTokens,
  deleteCachedUser,
  getCachedUser,
} from './user_cache.js';

function makeToken(sub, exp) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none' })}.${encode({ sub, exp })}.signature`;
}

describe('cacheAppleTokens', () => {
  const reference = {};
  const transaction = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore.doc.mockReturnValue(reference);
    mockFirestore.runTransaction.mockImplementation((callback) =>
      callback(transaction),
    );
    transaction.get.mockResolvedValue({
      data: () => ({ userId: 'app-user-id', exp: 100, other: 'preserved' }),
    });
  });

  it('atomically preserves the app user mapping and stores the new token expiration', async () => {
    const sub = 'apple-subject';
    const token = makeToken(sub, 200);

    await cacheAppleTokens(sub, token, 'apple-refresh-token');

    expect(mockFirestore.doc).toHaveBeenCalledWith(`apple_users/${sub}`);
    expect(mockFirestore.runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.get).toHaveBeenCalledWith(reference);
    expect(transaction.set).toHaveBeenCalledWith(reference, {
      userId: 'app-user-id',
      exp: 200,
      other: 'preserved',
      token,
      refreshToken: 'apple-refresh-token',
    });
  });

  it('does not cache a token whose subject differs from the verified subject', async () => {
    await expect(
      cacheAppleTokens(
        'verified-subject',
        makeToken('other-subject', 200),
        'refresh',
      ),
    ).rejects.toThrow(/subject or expiration/);

    expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
  });
});

describe('getCachedUser', () => {
  const reference = {};
  const token = makeToken('cached-subject', 2000000000);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore.doc.mockReturnValue(reference);
    reference.get = vi.fn().mockResolvedValue({
      data: () => ({ token, exp: 2000000000, userId: 'cached-user' }),
    });
  });

  it.each(['apple', 'utahid'])(
    'treats an expired %s cache entry as a miss',
    async (provider) => {
      const expiredToken = makeToken('cached-subject', 1);
      reference.get.mockResolvedValue({
        data: () => ({
          token: expiredToken,
          exp: 1,
          userId: 'cached-user',
        }),
      });

      await expect(getCachedUser(expiredToken, provider)).resolves.toBeNull();
    },
  );

  it('treats a cache entry with a mismatched expiration as a miss', async () => {
    reference.get.mockResolvedValue({
      data: () => ({ token, exp: 2000000001, userId: 'cached-user' }),
    });

    await expect(getCachedUser(token, 'apple')).resolves.toBeNull();
  });

  it('treats a token without a finite expiration as a cache miss', async () => {
    await expect(
      getCachedUser(makeToken('cached-subject', undefined), 'apple'),
    ).resolves.toBeNull();
    expect(reference.get).not.toHaveBeenCalled();
  });
});

describe('deleteCachedUser', () => {
  const reference = {};
  const transaction = {
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore.doc.mockReturnValue(reference);
    mockFirestore.runTransaction.mockImplementation((callback) =>
      callback(transaction),
    );
  });

  it('does not delete a cache entry for a different token with the same subject', async () => {
    const storedToken = makeToken('cached-subject', 2000000000);
    const forgedToken = makeToken('cached-subject', 2000000001);
    transaction.get.mockResolvedValue({ data: () => ({ token: storedToken }) });

    await deleteCachedUser(forgedToken, 'apple');

    expect(mockFirestore.runTransaction).toHaveBeenCalledOnce();
    expect(transaction.delete).not.toHaveBeenCalled();
  });

  it('deletes the cache entry when its token exactly matches', async () => {
    const token = makeToken('cached-subject', 2000000000);
    transaction.get.mockResolvedValue({ data: () => ({ token }) });

    await deleteCachedUser(token, 'apple');

    expect(transaction.delete).toHaveBeenCalledWith(reference);
  });
});
