import { db, mail } from './clients.js';
import { getTrackingSettings, pointGeographyToCoordinates } from './utilities.js';

export default async function sendReportNotification(report_id) {
  const report_info = await db('report_infos')
    .columns(
      '*',
      db.raw(pointGeographyToCoordinates('animal_location')),
      db.raw(pointGeographyToCoordinates('submit_location'))
    )
    .where({ report_id })
    .first();

  if (!report_info) {
    throw new Error(`report_id: ${report_id} does not exist`);
  }

  const public_report = await db('public_reports').where({ report_id }).first();
  const user = await db('users').where({ id: report_info.user_id }).first();
  let organization;
  if (user.organization_id) {
    organization = await db('organizations').where({ id: user.organization_id }).first();
  }

  const notificationData = {
    report: {
      ...report_info,
      submit_date: toMDTString(report_info.submit_date),
      animal_location: toPointObject(report_info.animal_location),
      ...public_report,
      discovery_date: toMDTString(public_report.discovery_date),
    },
    user: {
      ...user,
      organization: organization ? organization.name : null,
    },
    website: process.env.WEBSITE,
    api: process.env.API,
    environment: process.env.ENVIRONMENT,
  };

  let emails = await getEmailsForLocation(report_info.animal_location);

  if (!emails) {
    emails = [process.env.ADMIN_EMAIL];
    notificationData.noNotificationAreaFound = true;
  }

  const mailData = {
    to: emails,
    from: 'noreply@utah.gov',
    templateId: 'd-6fc7e07fdbe14f05ac67b728f6f8bf0f', // roadkill-report-notification
    dynamicTemplateData: notificationData,
    trackingSettings: getTrackingSettings(),
  };

  try {
    await mail.send(mailData);
  } catch (error) {
    console.error(error);
  }
}

async function getEmailsForLocation(location) {
  const emails = await db('users as u')
    .leftJoin('users_have_notification_areas as uha', 'u.id', 'uha.user_id')
    .leftJoin('notification_areas as na', 'uha.area_id', 'na.id')
    .column('u.email')
    .where(db.raw(`ST_Intersects(na.geog, ST_GeographyFromText('POINT(${location})'))`));

  if (emails.length === 0) {
    return null;
  }

  return emails.map((email) => email.email);
}

function toMDTString(date) {
  return date.toLocaleString(undefined, { timeZone: 'America/Denver' });
}

function toPointObject(coordinateString) {
  const [longitude, latitude] = coordinateString.split(' ');

  return { longitude, latitude };
}
