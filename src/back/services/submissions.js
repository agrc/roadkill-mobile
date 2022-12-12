import { db } from './clients.js';

export async function getMySubmissions(user_id) {
  console.log('user_id', user_id);
  const reports = await db('report_infos as r')
    .join('users as u', 'u.id', 'r.user_id')
    .leftJoin('pickup_reports as pick', 'pick.report_id', 'r.report_id')
    .select('r.report_id', 'r.photo_id', 'r.submit_date', 'r.common_name')
    .orderBy('r.submit_date', 'desc')
    .limit(100)
    .where({
      'u.id': user_id,
      'pick.route_id': null, // don't show pickups that are tied to a route
    });

  const routes = await db('routes as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.route_id', 'r.start_time', 'r.end_time', 'r.submit_date')
    .orderBy('r.submit_date', 'desc')
    .limit(100)
    .where({
      'u.id': user_id,
    });

  return reports.concat(routes).sort((a, b) => b.submit_date - a.submit_date);
}
