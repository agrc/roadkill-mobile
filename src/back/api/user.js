import { getUser, isExistingUser, registerUser, updateUser } from '../services/user_management.js';

export async function register(request, response) {
  const { user, organization } = request.body;

  if (await isExistingUser(user)) {
    return response.status(409).json({
      errors: 'user is already registered',
    });
  }

  await registerUser(organization, user);

  const newUser = await getUser(user.auth_id, user.auth_provider);

  // TODO: kick off email to admins for approval for contract/agency roles
  return response.status(201).json({ newUser });
}

export async function login(request, response) {
  const user = await getUser(request.body.auth_id, request.body.auth_provider);

  if (user?.id) {
    await updateUser(request.body);
  }

  return response.status(200).json({
    user: user?.id ? user : null,
    registered: user?.id ? true : false,
  });
}
