import { coordStringToWKT } from './utilities';

describe('coordStringToWKT', () => {
  it('returns the correct format', () => {
    expect(coordStringToWKT('1 2')).toBe('SRID=4326;POINT(1 2)');
  });
  it('returns null if input is empty', () => {
    expect(coordStringToWKT('')).toBe(null);
    expect(coordStringToWKT(null)).toBe(null);
    expect(coordStringToWKT(undefined)).toBe(null);
  });
});
