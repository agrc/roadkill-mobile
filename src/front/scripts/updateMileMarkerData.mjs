import { queryFeatures } from '@esri/arcgis-rest-feature-service';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const FEATURE_SERVICE_URL =
  'https://services.arcgis.com/pA2nEVnB6tquxgOW/ArcGIS/rest/services/Physical_Location_of_Reference_Post_Open_Data_RP/FeatureServer/3';

async function getMileMarkerFeatures() {
  console.log('Fetching mile marker features...');
  const features = [];
  const hasAllFeatures = false;

  while (!hasAllFeatures) {
    const response = await queryFeatures({
      url: FEATURE_SERVICE_URL,
      where: '1=1',
      outFields: ['OBJECTID', 'LEGEND_NUM', 'ROUTE_ID'],
      returnGeometry: true,
      resultOffset: features.length,
      resultRecordCount: 2000,
      outSR: 4326,
    });

    if (response.features.length === 0) {
      break;
    }

    features.push(...response.features);
    console.log(`Fetched ${features.length} features...`);
  }

  console.log(`total features: ${features.length}`);

  return features;
}

async function main() {
  console.log('Connecting to the database...');
  const dbPath = new URL('../data/mileMarkers.db', import.meta.url).pathname;
  console.log(`Database path: ${dbPath}`);
  try {
    await mkdir(dirname(dbPath));
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating database directory:', error);
      throw error;
    }
  }
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const features = await getMileMarkerFeatures();

  console.log('Dropping table if it exists...');
  await db.exec('DROP TABLE IF EXISTS mile_markers;');
  await db.exec('DROP INDEX IF EXISTS idx_coordinates;');

  console.log('Creating table if it does not exist...');
  await db.exec(
    `
      CREATE TABLE IF NOT EXISTS mile_markers (
        OBJECTID INTEGER PRIMARY KEY,
        LEGEND_NUM TEXT,
        LONGITUDE REAL,
        LATITUDE REAL,
        ROUTE_ID TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_coordinates ON mile_markers (LONGITUDE, LATITUDE);
      CREATE INDEX IF NOT EXISTS idx_route_id ON mile_markers (ROUTE_ID);
    `,
  );

  console.log('Inserting features...');
  const insertStmt = await db.prepare(
    'INSERT OR REPLACE INTO mile_markers (OBJECTID, LEGEND_NUM, LONGITUDE, LATITUDE, ROUTE_ID) VALUES (?, ?, ?, ?, ?)',
  );
  for (const feature of features) {
    await insertStmt.run(
      feature.attributes.OBJECTID,
      feature.attributes.LEGEND_NUM,
      feature.geometry.x,
      feature.geometry.y,
      feature.attributes.ROUTE_ID.slice(0, 4),
    );
  }
  await insertStmt.finalize();

  console.log('Deleting duplicates...');
  const deleteDuplicatesStmt = await db.prepare(
    `
      DELETE FROM mile_markers
      WHERE OBJECTID NOT IN (
        SELECT MIN(OBJECTID)
        FROM mile_markers
        GROUP BY LEGEND_NUM, ROUTE_ID
      );
    `,
  );
  await deleteDuplicatesStmt.run();
  await deleteDuplicatesStmt.finalize();
  await db.close();

  console.log('Mile marker data updated successfully!');
}

main();
