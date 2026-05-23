import { created, ok } from '../../utils/response.js';
import { createUserService, fetchUserService, updateUserService } from './user.service.js';

const createUserController = async (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    nationality,
    national_id,
    email,
    phone,
    photo_url
  } = req.body;

  const result = await createUserService({
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    nationality,
    national_id,
    email,
    phone,
    photo_url
  });

  return created(res, result, 'User registered successfully');
};
const updateUserController = async (req, res) => {
  const { uid } = req.user;

  const payload = {
    user_id: uid,
    phone: req.body.phone,
    photo_url: req.body.photo_url
  };

  const result = await updateUserService({ ...payload });

  return ok(res, result, 'User updated successfully');
};

const getUserByIdController = async (req, res) => {
  const { id } = req.params;
  const result = await fetchUserService(id);

  return ok(res, result, 'User retrieved successfully');
};

const getMyProfileController = async (req, res) => {
  const { uid } = req.user;
  const result = await fetchUserService(uid);

  return ok(res, result, 'User profile retrieved successfully');
};

export {
  createUserController,
  updateUserController,
  getUserByIdController,
  getMyProfileController,
};
