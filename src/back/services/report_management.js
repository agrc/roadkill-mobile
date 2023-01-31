import { db } from './clients.js';
import { pointCoordStringToWKT, pointGeographyToCoordinates } from './utilities.js';

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
          photo_location: pointCoordStringToWKT(photo_location),
          photo_date,
        },
        'id'
      );
    }

    const infosInsertResult = await transaction('report_infos').insert(
      {
        ...reportInfo,
        user_id: user_id,
        animal_location: pointCoordStringToWKT(animal_location),
        submit_location: pointCoordStringToWKT(submit_location),
        photo_id: photoInsertResult ? photoInsertResult[0].id : null,
      },
      'report_id'
    );

    const reportId = infosInsertResult[0].report_id;

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
  route_id,
  ...reportInfo
}) {
  return await db.transaction(async (transaction) => {
    let photoInsertResult;
    if (bucket_path) {
      photoInsertResult = await transaction('photos').insert(
        {
          bucket_path,
          photo_location: pointCoordStringToWKT(photo_location),
          photo_date,
        },
        'id'
      );
    }

    const infosInsertResult = await transaction('report_infos').insert(
      {
        ...reportInfo,
        user_id: user_id,
        animal_location: pointCoordStringToWKT(animal_location),
        submit_location: pointCoordStringToWKT(submit_location),
        photo_id: photoInsertResult ? photoInsertResult[0].id : null,
      },
      'report_id'
    );

    const reportId = infosInsertResult[0].report_id;

    await transaction('pickup_reports').insert({
      report_id: reportId,
      pickup_date,
      route_id,
    });

    return reportId;
  });
}

export async function getReport(reportId) {
  return await db('report_infos as r')
    .leftJoin('photos as p', 'p.id', 'r.photo_id')
    .leftJoin('public_reports as pub', 'pub.report_id', 'r.report_id')
    .leftJoin('pickup_reports as pick', 'pick.report_id', 'r.report_id')
    .columns(
      'r.report_id',
      db.raw(pointGeographyToCoordinates('animal_location')),
      'r.photo_id',
      db.raw(pointGeographyToCoordinates('photo_location')),
      'p.photo_date',
      db.raw(pointGeographyToCoordinates('submit_location')),
      'r.submit_date',
      'r.species_id',
      'r.common_name',
      'r.scientific_name',
      'r.species_type',
      'r.species_class',
      'r.species_order',
      'r.family',
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
