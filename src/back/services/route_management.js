import { db } from './clients.js';
import { lineCoordStringToWKT } from './utilities.js';

export async function createRoute({ user_id, geog, start_time, end_time, submit_date }) {
  const routeInsertResult = await db('routes').insert(
    {
      user_id,
      geog: lineCoordStringToWKT(geog),
      start_time,
      end_time,
      submit_date,
    },
    'route_id'
  );

  return routeInsertResult[0];
}
