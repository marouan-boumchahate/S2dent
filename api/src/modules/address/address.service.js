import db from '../../config/db.js';


// DTO
const toAddressDto = (address) => ({
  id: address.id,
  address_line1: address.address_line1,
  address_line2: address.address_line2,
  street: address.street,
  district: address.district,
  state: address.state,
  postal_code: address.postal_code,
  city: address.city,
  country: address.country,
  latitude: address.latitude,
  longitude: address.longitude
});


// Helpers
const insertAddressToDB = async ({
  user_id,
  academy_id,
  address_line1,
  address_line2,
  street,
  district,
  state,
  postal_code,
  city,
  country,
  latitude,
  longitude
}) => {
  const { rows: [address] } = await db.query(
    `INSERT INTO addresses (
      user_id,
      academy_id,
      address_line1,
      address_line2,
      street,
      district,
      state,
      postal_code,
      city,
      country,
      latitude,
      longitude
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    RETURNING
      id,
      user_id,
      academy_id,
      address_line1,
      address_line2,
      street,
      district,
      state,
      postal_code,
      city,
      country,
      latitude,
      longitude`,
    [
      user_id ?? null,
      academy_id ?? null,
      address_line1 ?? null,
      address_line2 ?? null,
      street ?? null,
      district ?? null,
      state ?? null,
      postal_code ?? null,
      city,
      country,
      latitude ?? null,
      longitude ?? null,
    ],
  );

  return { rows: [address] };
};
const updateAddressInDB = async (payload) => {
  const { 
    address_id,
    address_line1,
    address_line2,
    street,
    district,
    state,
    postal_code,
    city,
    country,
    latitude,
    longitude
  } = payload;

  const query = `
    UPDATE addresses
    SET address_line1 = COALESCE($1, address_line1),
        address_line2 = COALESCE($2, address_line2),
        street = COALESCE($3, street),
        district = COALESCE($4, district),
        state = COALESCE($5, state),
        postal_code = COALESCE($6, postal_code),
        city = COALESCE($7, city),
        country = COALESCE($8, country),
        latitude = COALESCE($9, latitude),
        longitude = COALESCE($10, longitude)
    WHERE id = $11
    RETURNING
      id,
      address_line1,
      address_line2,
      street,
      district,
      state,
      postal_code,
      city,
      country,
      latitude,
      longitude
  `;

  const { rows: [address] } = await db.query(query, [
    address_line1 ?? null,
    address_line2 ?? null,
    street ?? null,
    district ?? null,
    state ?? null,
    postal_code ?? null,
    city ?? null,
    country ?? null,
    latitude ?? null,
    longitude ?? null,
    address_id
  ]);

  return { rows: [address] };
};
const isAddressExists = async (id) => {
  const { rows: [row] } = await db.query('SELECT id FROM addresses WHERE academy_id = $1 OR user_id = $1', [id]);
  
  if (!row) {
    const err = new Error('Address not found');
    err.statusCode = 404;
    err.code = 'ADDRESS_NOT_FOUND';
    throw err;
  }

  return row.id;
}


// Services
const createAddressService = async (payload) => {
  const { rows: [address] } = await insertAddressToDB({ ...payload });

  if (address.user_id) payload.user_id = address.user_id;
  if (address.academy_id) payload.academy_id = address.academy_id;

  return {
    address: toAddressDto(address)
  };
};
const updateAddressService = async (payload) => {
  const { role_id, user_id } = payload;
  const id = user_id ?? role_id;

  const address_id = await isAddressExists(id);

  const { rows: [address] } = await updateAddressInDB({ ...payload, address_id });

  return {
    address: toAddressDto(address)
  };
};


export { createAddressService, updateAddressService };
