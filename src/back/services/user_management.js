import commonConfig from 'common/config.js';
import { randomUUID } from 'crypto';
import humanizeDuration from 'humanize-duration';
import yup from 'yup';
import config from '../config.js';
import { db, firestore, mail } from './clients.js';

const ROLES = {
  agency: 'agency',
  contractor: 'contractor',
  public: 'reporter',
  admin: 'admin',
};
const NO_REPLY_EMAIL = 'noreply@utah.gov';

export const EXPIRED_APPROVAL = 'EXPIRED_APPROVAL';

// TODO: clean up after 0.0.0 is gone
export const registerSchema_0_0_0 = yup.object().shape({
  organization: yup
    .object()
    .shape({
      name: yup.string().required(),
      org_type: yup.string().required(),
    })
    .nullable(),
  user: yup
    .object()
    .shape({
      organization_id: yup.number(),
      role: yup.string().required(),
      auth_provider: yup.string().required(),
      auth_id: yup.string().required(),
      email: yup.string().email().required(),
      first_name: yup.string().required(),
      last_name: yup.string().required(),
      phone: yup.string().required(),
    })
    .required(),
});

export const registerSchema = yup.object().shape({
  organization: yup
    .object()
    .shape({
      name: yup.string().required(),
      org_type: yup.string().required(),
      id: yup.number().required(),
    })
    .nullable(),
  user: yup
    .object()
    .shape({
      role: yup.string().required(),
      auth_provider: yup.string().required(),
      auth_id: yup.string().required(),
      email: yup.string().email().required(),
      first_name: yup.string().required(),
      last_name: yup.string().required(),
      phone: yup.string().required(),
    })
    .required(),
});

export const loginSchema = yup.object().shape({
  auth_id: yup.string().required(),
  auth_provider: yup.string().required(),
  email: yup.string().email().required(),
  first_name: yup.string().required(),
  last_name: yup.string().required(),
});

export async function isExistingUser({ auth_provider, auth_id }) {
  const rows = await db.select('*').from('users').where({ auth_provider, auth_id });

  return rows.length > 0;
}

async function ensureOrganization(organization, transaction) {
  let orgId = organization ? organization.id : null;
  if (organization && organization.id === commonConfig.otherOrg.id) {
    const orgInsertResult = await transaction('organizations').insert(
      {
        name: organization.name,
        org_type: organization.org_type,
      },
      'id'
    );
    orgId = orgInsertResult[0];
  }

  return orgId;
}

export async function registerUser_0_0_0(organization, user) {
  let approved = null;
  await db.transaction(async (transaction) => {
    const now = new Date();

    let orgInsertResult;
    if (organization) {
      orgInsertResult = await transaction('organizations').insert(organization, 'id');
    }
    let approved_date = null;
    if (user.role === ROLES.public) {
      approved = true;
      approved_date = now;
    }

    await transaction('users').insert({
      ...user,
      registered_date: now,
      last_logged_in: now,
      organization_id: organization ? orgInsertResult[0] : null,
      approved,
      approved_date,
    });
  });

  if (!approved) {
    sendApprovalEmail(user, organization);
  }
}

export async function registerUser(organization, user) {
  let approved = null;
  await db.transaction(async (transaction) => {
    const now = new Date();

    const orgId = await ensureOrganization(organization, transaction);

    let approved_date = null;
    if (user.role === ROLES.public) {
      approved = true;
      approved_date = now;
    }

    await transaction('users').insert({
      ...user,
      registered_date: now,
      last_logged_in: now,
      organization_id: orgId,
      approved,
      approved_date,
    });
  });

  if (!approved) {
    sendApprovalEmail(user, organization);
  }
}

const APPROVAL_DOC_TYPE = 'approvals';
export async function sendApprovalEmail(user, organization) {
  const guid = randomUUID();

  const approvalExpiration = Date.now() + config.APPROVAL_EXPIRATION_PERIOD;
  const document = firestore.doc(`${APPROVAL_DOC_TYPE}/${guid}`);
  await document.set({
    ...user,
    approvalExpiration,
  });

  const data = {
    user,
    organization,
    guid,
    api: process.env.API,
    environment: process.env.ENVIRONMENT,
  };

  const email = {
    to: process.env.ADMIN_EMAIL,
    from: NO_REPLY_EMAIL,
    templateId: 'd-021d5c287a1d4295a7ade35724bd2994', // roadkill-new-user
    dynamicTemplateData: data,
  };

  if (process.env.ENVIRONMENT === 'development') {
    mail.trackingSettings = {
      clickTracking: {
        enable: false,
      },
    };
  }

  try {
    await mail.send(email);
  } catch (error) {
    console.error(error);
  }
}

async function sendApproveRejectNotificationEmail(user, rejected) {
  const data = {
    user,
    rejected,
    environment: process.env.ENVIRONMENT,
  };

  const email = {
    to: process.env.ADMIN_EMAIL,
    from: NO_REPLY_EMAIL,
    templateId: 'd-ae24b5a55c9e461298a1bfc14e0b383e',
    dynamicTemplateData: data,
  };

  if (process.env.ENVIRONMENT === 'development') {
    mail.trackingSettings = {
      clickTracking: {
        enable: false,
      },
    };
  }

  try {
    await mail.send(email);
  } catch (error) {
    console.error(error);
  }
}

async function getUserFromGUID(guid) {
  const document = firestore.doc(`${APPROVAL_DOC_TYPE}/${guid}`);
  const snapshot = await document.get();

  if (!snapshot.exists) {
    const error = new Error('invalid approval guid!');
    error.code = 'INVALID_GUID';

    throw error;
  }

  return snapshot.data();
}

export function checkExpiration(user) {
  if (!user.approvalExpiration || user.approvalExpiration < Date.now()) {
    const error = new Error(
      `It has been more than ${humanizeDuration(config.APPROVAL_EXPIRATION_PERIOD)} since ${user.first_name} ${
        user.last_name
      } (${user.email}) registered. Their approval has expired. Approval will need to be done in the database directly.`
    );
    error.code = EXPIRED_APPROVAL;

    throw error;
  }
}

export async function approveUser(guid, role) {
  const user = await getUserFromGUID(guid);
  const userInfo = `${user.first_name} ${user.last_name} (${user.email})`;

  checkExpiration(user);

  await db('users').where({ auth_id: user.auth_id, auth_provider: user.auth_provider }).update({
    role,
    approved_date: new Date(),
    approved: true,
  });

  await sendApproveRejectNotificationEmail({ ...user, role }, false);

  return `${userInfo} has been approved as: ${role}`;
}

export async function rejectUser(guid) {
  const user = await getUserFromGUID(guid);

  checkExpiration(user);

  await db('users').where({ auth_id: user.auth_id, auth_provider: user.auth_provider }).update({
    approved_date: new Date(),
    approved: false,
  });

  await sendApproveRejectNotificationEmail(user, true);

  return `${user.first_name} ${user.last_name} (${user.email}) has been rejected`;
}

export async function updateUser({ auth_id, auth_provider, email, first_name, last_name }) {
  await db('users').where({ auth_id, auth_provider }).update({
    email,
    first_name,
    last_name,
    last_logged_in: new Date(),
  });
}

export async function getUser(auth_id, auth_provider) {
  const rows = await db('users').select('*').where({ auth_provider, auth_id });

  return rows[0];
}

// TODO: clean up after 0.0.0
export async function getProfile_0_0_0(userId) {
  const profileData = await db('users as u')
    .leftJoin('organizations as o', 'u.organization_id', 'o.id')
    .columns(
      'u.auth_provider',
      'u.email',
      'u.first_name',
      'u.last_name',
      'u.phone',
      'u.role',
      'u.approved',
      'u.registered_date',
      { organization: 'o.name' }
    )
    .where({ 'u.id': userId })
    .first();

  const reportsSubmitted = await db('report_infos').count('report_id').where({ user_id: userId });

  return {
    ...profileData,
    reports_submitted: reportsSubmitted[0].count,
  };
}

export async function getProfile(userId) {
  const profileData = await db('users as u')
    .leftJoin('organizations as o', 'u.organization_id', 'o.id')
    .columns(
      'u.auth_provider',
      'u.email',
      'u.first_name',
      'u.last_name',
      'u.phone',
      'u.role',
      'u.approved',
      'u.registered_date',
      { organization_name: 'o.name' },
      'u.organization_id'
    )
    .where({ 'u.id': userId })
    .first();

  const reportsSubmitted = await db('report_infos').count('report_id').where({ user_id: userId });

  return {
    ...profileData,
    reports_submitted: reportsSubmitted[0].count,
  };
}

// TODO: clean up after 0.0.0
export async function updateProfile_0_0_0(userId, profile, organizationId) {
  const { phone, organization } = profile;

  await db('users').where({ id: userId }).update({
    phone,
  });

  await db('organizations').where({ id: organizationId }).update({
    name: organization,
  });
}

export async function updateProfile(userId, profile) {
  const { phone, organization_id, organization_name, organization_type } = profile;

  await db.transaction(async (transaction) => {
    const orgId = await ensureOrganization(
      { id: organization_id, name: organization_name, org_type: organization_type },
      transaction
    );

    await transaction('users').where({ id: userId }).update({
      organization_id: orgId,
      phone,
    });
  });
}
