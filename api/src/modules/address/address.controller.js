import { createAddressService, updateAddressService, fetchAddressByIdService } from './address.service.js';
import { created, ok } from '../../utils/response.js';


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
const updateAddressController = async (req, res) => {
  const { rid, uid } = req.user;

  const payload = {
    user_id: uid,
    role_id: rid,
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

  const result = await updateAddressService({ ...payload });

  return ok(res, result, 'Address updated successfully');
};
const getUserAddressController = async (req, res) => {
  const { uid, pid, role } = req.user
  
  const result = await fetchAddressByIdService({
    uid, pid
  }, role)

  return ok(res, result, 'Address fetched successfully')
};
const getAddressController = async (req, res) => {
  const result = await fetchAddressByIdService({aid: req.params.id})
  return ok(res, result, 'Address fetched successfully')
};


export { 
  createAddressController, 
  updateAddressController, 
  getUserAddressController, 
  getAddressController
};
