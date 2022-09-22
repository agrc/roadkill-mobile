import { db } from './clients.js';
import { lineCoordStringToWKT, pointGeographyToCoordinates } from './utilities.js';

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

  return routeInsertResult[0].route_id;
}

export async function getRoute(routeId, userId) {
  const route = await db('routes as r')
    .select(
      'r.route_id',
      // simplify with a tolerance of 100 meters
      db.raw('ST_asText(ST_Transform(ST_Simplify(ST_Transform(r.geog::geometry, 26912), 50), 4326)) as geog'),
      // using a tiny expand to guarantee that we always get a polygon
      // for points and vertical lines,ST_Envelope will return a point or line
      db.raw('ST_asText(ST_Envelope(ST_Expand(r.geog::geometry, 0.0000001))) as extent'),
      db.raw('ST_Length(geog) as distance'),
      'r.start_time',
      'r.end_time',
      'r.submit_date'
    )
    .where({ 'r.route_id': routeId, 'r.user_id': userId })
    .first();

  const pickups = await db('report_infos as r')
    .leftJoin('pickup_reports as pick', 'pick.report_id', 'r.report_id')
    .select(
      'r.report_id',
      'r.photo_id',
      'r.submit_date',
      'r.common_name',
      db.raw(pointGeographyToCoordinates('animal_location'))
    )
    .orderBy('r.submit_date', 'desc')
    .limit(100)
    .where({
      'r.user_id': userId,
      'pick.route_id': routeId,
    });

  return {
    ...route,
    pickups,
  };
}
