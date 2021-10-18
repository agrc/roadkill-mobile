import { db } from './clients.js';
import { coordStringToWKT } from './utilities.js';

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
