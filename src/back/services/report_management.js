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
  ...reportInfo
}) {
  console.log('createReport');
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

      // TODO: replace this with actual data
      discovery_date: new Date(1632266401947).toISOString(),
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
  ...reportInfo
}) {
  console.log('createPickup');
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

    return infosInsertResult[0];
  });
}
