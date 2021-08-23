import { ARCHIVED_USER } from '../services/user_management.js';

export function getRegister(isExistingUser, registerUser, getUser) {
  return async function register(request, response) {
    const { user, organization } = request.body;

    if (await isExistingUser(user)) {
      return response.status(409).json({
        errors: 'user is already registered',
      });
    }

    await registerUser(organization, user);

    const newUser = await getUser(user.auth_id, user.auth_provider);

    return response.status(201).json({ newUser });
  };
}

export function getLogin(getUser, updateUser) {
  return async function login(request, response) {
    const user = await getUser(request.body.auth_id, request.body.auth_provider);

    if (user?.id) {
      await updateUser(request.body);
    }

    return response.status(200).json({
      user: user?.id ? user : null,
      registered: user?.id ? true : false,
    });
  };
}

export function getApprove(approveUser) {
  return async function approve(request, response) {
    const { guid, role } = request.params;

    let result;
    try {
      result = await approveUser(guid, role);
    } catch (error) {
      if (error.code === 'INVALID_GUID') {
        return response.status(401).send(error.message);
      } else if (error.code === ARCHIVED_USER) {
        return response.status(403).send(error.message);
      } else {
        return response.status(500).send(error.message);
      }
    }

    return response.status(200).send(result);
  };
}

export function getReject(rejectUser) {
  return async function reject(request, response) {
    const { guid } = request.params;

    let result;
    try {
      result = await rejectUser(guid);
    } catch (error) {
      if (error.code === 'INVALID_GUID') {
        return response.status(401).send(error.message);
      } else {
        return response.status(500).send(error.message);
      }
    }

    return response.status(200).send(result);
  };
}
