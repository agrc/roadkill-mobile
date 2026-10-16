import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRoute } from './route_management.js';

const mocks = vi.hoisted(() => {
  const routeBuilder = {
    select: vi.fn(),
    where: vi.fn(),
    first: vi.fn(),
  };
  routeBuilder.select.mockReturnValue(routeBuilder);
  routeBuilder.where.mockReturnValue(routeBuilder);

  const pickupState = { rows: [] };
  const pickupBuilder = {
    leftJoin: vi.fn(),
    select: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    where: vi.fn(),
    then: (resolve, reject) =>
      Promise.resolve(pickupState.rows).then(resolve, reject),
  };
  pickupBuilder.leftJoin.mockReturnValue(pickupBuilder);
  pickupBuilder.select.mockReturnValue(pickupBuilder);
  pickupBuilder.orderBy.mockReturnValue(pickupBuilder);
  pickupBuilder.limit.mockReturnValue(pickupBuilder);
  pickupBuilder.where.mockReturnValue(pickupBuilder);

  const db = vi.fn((table) =>
    table === 'routes as r' ? routeBuilder : pickupBuilder,
  );
  db.raw = vi.fn((sql) => sql);

  return { db, pickupState, routeBuilder };
});

vi.mock('./clients.js', () => ({ db: mocks.db }));

describe('getRoute', () => {
  beforeEach(() => {
    mocks.db.raw.mockClear();
    mocks.routeBuilder.first.mockReset();
  });

  it('returns the stored route geometry without server-side simplification', async () => {
    const route = {
      route_id: 234,
      geog: 'LINESTRING(-111.8 40.7,-111.81 40.71,-111.82 40.72)',
    };
    const pickups = [{ report_id: 1 }];
    mocks.routeBuilder.first.mockResolvedValue(route);
    mocks.pickupState.rows = pickups;

    await expect(getRoute(234, 42)).resolves.toEqual({ ...route, pickups });

    expect(mocks.db.raw).toHaveBeenCalledWith('ST_asText(r.geog) as geog');
    expect(
      mocks.db.raw.mock.calls.some(([sql]) => sql.includes('ST_Simplify')),
    ).toBe(false);
  });
});
