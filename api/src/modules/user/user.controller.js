import { created } from '../../utils/response.js';
import { createUserService } from './user.service.js';

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
    photo_url,
    notes,
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
    photo_url,
    notes,
  });

  return created(res, result, 'User registered successfully');
};

export { createUserController };
