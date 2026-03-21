import db from '../../config/db.js';

const ensureAcademyUnique = async (
  email, 
  name,
  short_name
) => {
  const [emailExists, nameExists, shortNameExists] = await Promise.all([
    db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM academies WHERE name = $1 LIMIT 1', [name]),
    db.query('SELECT id FROM academies WHERE short_name = $1 LIMIT 1', [short_name.toUpperCase()]),
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

  if (shortNameExists.rows.length > 0) {
    const err = new Error('An academy with this short name already exists');
    err.statusCode = 409;
    err.code = 'ACADEMY_SHORT_NAME_DUPLICATE';
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
  academyId,
  name,
  shortName,
  type,
  country,
  city,
  address,
  website
) => {
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (user_id, academy_number, name, short_name, type, country, city, address, website)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, academy_number, user_id, name, short_name, type, country, city, address, website`,
    [userId, academyId, name, shortName, type, country, city, address ?? null, website ?? null],
  );

  return { rows: [academy] };
};

const generateRandomAcademyId = async () => {
  const result = await db.query(`SELECT nextval('academy_seq')`);
  const seq = result.rows[0].nextval;

  const now = new Date();
  const date = now.toISOString().slice(2,10).replace(/-/g,'');

  const academyId = `ACD_${date}${seq}`;

  return academyId;
}


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
  await ensureAcademyUnique(email, name, short_name);
  const academyId = await generateRandomAcademyId();
  
  const { rows: [user] } = await insertUserToDB(email, wallet_address.toLowerCase());

  const { rows: [academy] } = await insertAcademyToDB(
    user.id,
    academyId,
    name,
    short_name.toUpperCase(), 
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
      academy_number: academy.academy_number,
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