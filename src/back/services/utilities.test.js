import { describe, expect, it } from 'vitest';
import { pointCoordStringToWKT } from './utilities';

describe('pointCoordStringToWKT', () => {
  it('returns the correct format', () => {
    expect(pointCoordStringToWKT('1 2')).toBe('SRID=4326;POINT(1 2)');
  });
  it('returns null if input is empty', () => {
    expect(pointCoordStringToWKT('')).toBe(null);
    expect(pointCoordStringToWKT(null)).toBe(null);
    expect(pointCoordStringToWKT(undefined)).toBe(null);
  });
});
