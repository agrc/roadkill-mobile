import { Firestore } from '@google-cloud/firestore';
import sgMail from '@sendgrid/mail';
import { randomUUID } from 'crypto';
import knex from 'knex';
import yup from 'yup';

const ROLES = {
  agency: 'agency',
  contractor: 'contractor',
  public: 'reporter',
  admin: 'admin',
};

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST,
    user: 'api',
    password: process.env.DATABASE_PASSWORD,
    database: 'app',
  },
});
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const firestore = new Firestore();

export const registerSchema = yup.object().shape({
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

export async function registerUser(organization, user) {
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

const APPROVAL_DOC_TYPE = 'approvals';
export async function sendApprovalEmail(user, organization) {
  const guid = randomUUID();

  const document = firestore.doc(`${APPROVAL_DOC_TYPE}/${guid}`);
  await document.set(user);

  const data = {
    user,
    organization,
    guid,
    api: process.env.API,
  };

  const email = {
    to: process.env.ADMIN_EMAIL,
    from: 'noreply@utah.gov',
    templateId: 'd-021d5c287a1d4295a7ade35724bd2994',
    dynamicTemplateData: data,
  };

  try {
    await sgMail.send(email);
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

async function deleteUserByGUID(guid) {
  const document = firestore.doc(`${APPROVAL_DOC_TYPE}/${guid}`);
  await document.delete();
}

export async function approveUser(guid, role) {
  const user = await getUserFromGUID(guid);

  await db('users').where({ auth_id: user.auth_id, auth_provider: user.auth_provider }).update({
    role,
    approved_date: new Date(),
    approved: true,
  });

  await deleteUserByGUID(guid);

  return `${user.first_name} ${user.last_name} (${user.email}) has been approved as: ${role}`;
}

export async function rejectUser(guid) {
  const user = await getUserFromGUID(guid);

  await db('users').where({ auth_id: user.auth_id, auth_provider: user.auth_provider }).del();

  await deleteUserByGUID(guid);

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
