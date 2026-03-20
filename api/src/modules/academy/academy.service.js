import db from '../../config/db.js';

const ensureAcademyUnique = async (
  email, 
  name
) => {
  const [emailExists, nameExists] = await Promise.all([
    db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM academies WHERE name = $1 LIMIT 1', [name]),
  ]);

  if (emailExists.rows.length > 0) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    err.code = 'EMAIL_DUPLICATE';
    throw err;
  }

  if (nameExists.rows.length > 0) {
    const err = new Error('An academy with this name already exists');
    err.statusCode = 409;
    err.code = 'ACADEMY_DUPLICATE';
    throw err;
  }
}

const insertUserToDB = async (
  email, 
  walletAddress
) => {
  const { rows: [user] } = await db.query(
    `INSERT INTO users (email, wallet_address, role)
      VALUES ($1, $2, 'academy_admin')
      RETURNING id, email, wallet_address`,
    [email, walletAddress],
  );

  return { rows: [user] };
}

const insertAcademyToDB = async (
  userId,
  name,
  shortName,
  type,
  country,
  city,
  address,
  website
) => {
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (user_id, name, short_name, type, country, city, address, website)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, name, short_name, type, country, city, address, website`,
    [userId, name, shortName ?? null, type, country, city, address ?? null, website ?? null],
  );

  return { rows: [academy] };
};


const createAcademyService = async ({
  wallet_address,
  email, 
  name, 
  short_name, 
  type, 
  country, 
  city, 
  address, 
  website 
}) => {
  await ensureAcademyUnique(email, name);
  
  const { rows: [user] } = await insertUserToDB(email, wallet_address.toLowerCase());

  const { rows: [academy] } = await insertAcademyToDB(
    user.id, 
    name,
    short_name ?? null, 
    type,
    country,
    city,
    address ?? null,
    website ?? null
  );

  return {
    academy: {
      id: academy.id,
      wallet_address: user.wallet_address,
      name: academy.name,
      short_name: academy.short_name,
      type: academy.type,
      email: user.email,
      country: academy.country,
      city: academy.city,
      address: academy.address,
      website: academy.website
    },
  };
};

export { createAcademyService};