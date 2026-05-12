import { created, ok } from '../../utils/response.js';
import { createUserService, updateUserService } from './user.service.js';

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

export { createUserController, updateUserController };
