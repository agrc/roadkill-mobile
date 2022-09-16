import { db } from '../services/clients.js';
import { EXPIRED_APPROVAL } from '../services/user_management.js';

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

export function getLogin(getUser, updateUser, getConstants) {
  return async function login(request, response) {
    const user = await getUser(request.body.auth_id, request.body.auth_provider);

    if (user?.id) {
      await updateUser(request.body);
    }

    return response.status(200).json({
      user: user?.id ? user : null,
      registered: user?.id ? true : false,
      constants: await getConstants(db),
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
      } else if (error.code === EXPIRED_APPROVAL) {
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

export function getGetProfile(getProfile) {
  return async function getProfileHandler(_, response) {
    let profileData;
    try {
      profileData = await getProfile(response.locals.user.appUser.id);
    } catch (error) {
      return response.status(500).send(error.message);
    }

    return response.status(200).json({ profile: profileData });
  };
}

export function getUpdateProfile(updateProfile) {
  return async function updateProfileHandler(request, response) {
    try {
      await updateProfile(response.locals.user.appUser.id, request.body);
    } catch (error) {
      return response.status(500).send(error.message);
    }

    return response.status(200).json({ success: true });
  };
}

export function getDeleteUser(deleteUser) {
  return async function deleteUserHandler(_, response) {
    try {
      await deleteUser(response.locals.user.appUser.id);
    } catch (error) {
      return response.status(500).send(error.message);
    }

    return response.status(200).json({ success: true });
  };
}
