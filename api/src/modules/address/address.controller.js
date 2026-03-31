import { createAddressService } from './address.service.js';
import { created } from '../../utils/response.js';

const createAddressController = async (req, res) => {
  const payload = {
    user_id: req.body.user_id,
    academy_id: req.body.academy_id,
    address_line1: req.body.address_line1,
    address_line2: req.body.address_line2,
    street: req.body.street,
    district: req.body.district,
    state: req.body.state,
    postal_code: req.body.postal_code,
    city: req.body.city,
    country: req.body.country,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  };

  const result = await createAddressService({ ...payload });

  return created(res, result, 'Address created successfully');
};

export { createAddressController };
