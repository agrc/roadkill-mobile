import { getSubmitValues } from './Report';

describe('getSubmitValues', () => {
  it('copies values from input object', () => {
    const input = { a: 1, b: 2 };

    const output = getSubmitValues(input);

    expect(output.a).toBe(1);
    expect(output.b).toBe(2);
  });
  it('formats date objects', () => {
    const input = { a: 1, b: new Date(1641320248681) };

    const output = getSubmitValues(input);

    expect(output.b).toEqual('2022-01-04T18:17:28.681Z');
  });
  it('handles objects as values', () => {
    const input = { a: 1, b: { c: 2 } };

    const output = getSubmitValues(input);

    expect(output.b.c).toBe(2);
  });
  it('skips null values', () => {
    const input = { a: 1, b: null, c: false };

    const output = getSubmitValues(input);

    expect(output.b).toBeUndefined();
    expect(output.c).toBe(false);
  });
});
