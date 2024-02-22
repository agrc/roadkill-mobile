import { Storage } from '@google-cloud/storage';
import knex from 'knex';

const email = process.argv[2];

console.log(`Migrating reports from staging to production for email: ${email}`);

const stagingDb = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: '',
    user: '',
    password: '',
    database: '',
  },
});

const prodDb = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: '',
    user: '',
    password: '',
    database: 'app',
  },
});

const stagingStorage = new Storage({
  projectId: '',
});
const stagingBucket = stagingStorage.bucket('');

console.log('querying for user id in prod database...');
const { id: user_id } = await prodDb('users')
  .select('id')
  .where({ email })
  .first();

console.log('production user id: ', user_id);

console.log('querying for reports in staging...');
const stagingReports = await stagingDb('report_infos as r')
  .leftJoin('photos as p', 'p.id', 'r.photo_id')
  .leftJoin('pickup_reports as pick', 'pick.report_id', 'r.report_id')
  .leftJoin('users as u', 'u.id', 'r.user_id')
  .columns(
    'r.report_id',
    'animal_location',
    'r.photo_id',
    'p.photo_location',
    'p.photo_date',
    'p.bucket_path',
    'submit_location',
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
  )
  .where({ 'u.email': email });

console.log('number of staging reports to migrate: ', stagingReports.length);

const migrations = [];
for (const report of stagingReports) {
  const {
    bucket_path,
    photo_date,
    photo_location,
    animal_location,
    submit_location,
    submit_date,
    species_id,
    common_name,
    scientific_name,
    species_type,
    species_class,
    species_order,
    family,
    species_confidence_level,
    sex,
    age_class,
    comments,
    pickup_date,
    route_id,
  } = report;

  await prodDb.transaction(async (transaction) => {
    console.log(`inserting report: ${pickup_date}...`);
    let photoInsertResult;
    if (bucket_path) {
      const file = stagingBucket.file(bucket_path);
      const imageName = file.name.split('/').pop();
      const newPath = `${user_id}/${imageName}`;
      await file.copy(`gs://<bucket-name>/${newPath}`);
      photoInsertResult = await transaction('photos').insert(
        {
          bucket_path: newPath,
          photo_location,
          photo_date,
        },
        'id',
      );
    }

    const infosInsertResult = await transaction('report_infos').insert(
      {
        user_id,
        animal_location,
        photo_id: photoInsertResult ? photoInsertResult[0].id : null,
        submit_location,
        submit_date,
        species_id,
        common_name,
        scientific_name,
        species_type,
        species_class,
        species_order,
        family,
        species_confidence_level,
        sex,
        age_class,
        comments,
      },
      'report_id',
    );

    const reportId = infosInsertResult[0].report_id;

    await transaction('pickup_reports').insert({
      report_id: reportId,
      pickup_date,
      route_id,
    });

    migrations.push(reportId);
  });
}

console.log(`migrated ${migrations.length} reports for email: ${email}`);

process.exit();
