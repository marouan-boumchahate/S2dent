import { createAddressService } from './address.service.js';
import { created } from '../../utils/response.js';

const createAddressController = async (req, res) => {
  const {
    address_line1,
    address_line2,
    street,
    district,
    state,
    postal_code,
    city,
    country,
    latitude,
    longitude,
  } = req.body;

  const result = await createAddressService({
    address_line1,
    address_line2,
    street,
    district,
    state,
    postal_code,
    city,
    country,
    latitude,
    longitude,
  });

  return created(res, result, 'Address created successfully');
};

export { createAddressController };
