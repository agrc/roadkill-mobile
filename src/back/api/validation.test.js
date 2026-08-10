import { describe, expect, it, vi } from 'vitest';
import { truncateOverlongComments } from './validation.js';

describe('truncateOverlongComments', () => {
  it('truncates overlong comments and logs only metadata', () => {
    const comments = 'a'.repeat(513);
    const request = {
      body: { comments },
      originalUrl: '/reports/report',
    };
    const next = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    truncateOverlongComments(request, {}, next);

    expect(request.body.comments).toHaveLength(512);
    expect(next).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('truncating overlong report comments', {
      originalLength: 513,
      url: '/reports/report',
    });

    warn.mockRestore();
  });

  it('leaves valid comments unchanged', () => {
    const request = {
      body: { comments: 'short comment' },
      originalUrl: '/reports/report',
    };
    const next = vi.fn();

    truncateOverlongComments(request, {}, next);

    expect(request.body.comments).toBe('short comment');
    expect(next).toHaveBeenCalledOnce();
  });
});
