import { db } from './clients.js';
import { coordStringToWKT, geographyToCoordinates } from './utilities.js';

export async function createReport({
  bucket_path,
  photo_location,
  photo_date,
  submit_location,
  animal_location,
  user_id,
  repeat_submission,
  discovery_date,
  ...reportInfo
}) {
  return await db.transaction(async (transaction) => {
    let photoInsertResult;
    if (bucket_path) {
      photoInsertResult = await transaction('photos').insert(
        {
          bucket_path,
          photo_location: coordStringToWKT(photo_location),
          photo_date,
        },
        'id'
      );
    }

    const infosInsertResult = await transaction('report_infos').insert(
      {
        ...reportInfo,
        user_id: user_id,
        animal_location: coordStringToWKT(animal_location),
        submit_location: coordStringToWKT(submit_location),
        photo_id: photoInsertResult ? photoInsertResult[0] : null,
      },
      'report_id'
    );

    const reportId = infosInsertResult[0];

    await transaction('public_reports').insert({
      report_id: reportId,
      repeat_submission,
      discovery_date,
    });

    return reportId;
  });
}

export async function createPickup({
  bucket_path,
  photo_location,
  photo_date,
  submit_location,
  animal_location,
  user_id,
  pickup_date,
  ...reportInfo
}) {
  return await db.transaction(async (transaction) => {
    const photoInsertResult = await transaction('photos').insert(
      {
        bucket_path,
        photo_location: coordStringToWKT(photo_location),
        photo_date,
      },
      'id'
    );
    const infosInsertResult = await transaction('report_infos').insert(
      {
        ...reportInfo,
        user_id: user_id,
        animal_location: coordStringToWKT(animal_location),
        submit_location: coordStringToWKT(submit_location),
        photo_id: photoInsertResult[0],
      },
      'report_id'
    );

    const reportId = infosInsertResult[0];

    await transaction('pickup_reports').insert({
      report_id: reportId,
      pickup_date,
      route_id: 1, // TODO - replace with real route id
    });

    return reportId;
  });
}

export async function getAllReports(auth_id, auth_provider) {
  return await db('report_infos as r')
    .join('users', 'users.id', 'r.user_id')
    .select('r.report_id', 'r.photo_id', 'r.submit_date', 'r.species')
    .orderBy('r.submit_date', 'desc')
    .limit(100)
    .where({
      'users.auth_id': auth_id,
      'users.auth_provider': auth_provider,
    });
}

export async function getReport(reportId) {
  return await db('report_infos as r')
    .leftJoin('photos as p', 'p.id', 'r.photo_id')
    .leftJoin('public_reports as pub', 'pub.report_id', 'r.report_id')
    .leftJoin('pickup_reports as pick', 'pick.report_id', 'r.report_id')
    .columns(
      'r.report_id',
      db.raw(geographyToCoordinates('animal_location')),
      'r.photo_id',
      db.raw(geographyToCoordinates('photo_location')),
      'p.photo_date',
      db.raw(geographyToCoordinates('submit_location')),
      'r.submit_date',
      'r.species',
      'r.species_confidence_level',
      'r.sex',
      'r.age_class',
      'r.comments',
      'pick.pickup_date',
      'pick.route_id',
      'pub.repeat_submission',
      'pub.discovery_date'
    )
    .where({ 'r.report_id': reportId })
    .first();
}
