import db from '../../config/db.js';

const insertAddressToDB = async ({
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
}) => {
  const { rows: [address] } = await db.query(
    `INSERT INTO addresses (
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
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    )
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
      longitude`,
    [
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

const createAddressService = async (payload) => {
  const {
    rows: [address],
  } = await insertAddressToDB(payload);

  return {
    address: {
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
      longitude: address.longitude,
    },
  };
};

export { createAddressService };
