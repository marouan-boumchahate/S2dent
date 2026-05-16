import db from '../../config/db.js';
import { ethers } from 'ethers';


// DTOs
const academyDto = (academy) => ({
  id: academy.id,
  academy_number: academy.academy_number,
  email: academy.email,
  name: academy.name,
  short_name: academy.short_name,
  type: academy.type,
  description: academy.description,
  website: academy.website,
  logo_url: academy.logo_url,
  phone: academy.phone,
  legal_name: academy.legal_name,
  registration_number: academy.registration_number,
  tax_id: academy.tax_id,
  billing_email: academy.billing_email,
});


// Helpers
const ensureAcademyUnique = async (
  email,
  name,
  short_name
) => {
  const { rows } = await db.query(
    `SELECT
       CASE
         WHEN email = $1 THEN 'email'
         WHEN name = $2 THEN 'name'
         WHEN short_name = $3 THEN 'short_name'
       END AS conflict
     FROM academies
     WHERE email = $1 OR name = $2 OR short_name = $3
     LIMIT 1`,
    [email, name, short_name.toUpperCase()],
  );

  if (rows.length > 0) {
    const conflict = rows[0].conflict;

    if (conflict === 'email') {
      const err = new Error('An academy with this email already exists');
      err.statusCode = 409;
      err.code = 'ACADEMY_EMAIL_DUPLICATE';
      throw err;
    }

    if (conflict === 'name') {
      const err = new Error('An academy with this name already exists');
      err.statusCode = 409;
      err.code = 'ACADEMY_DUPLICATE';
      throw err;
    }

    if (conflict === 'short_name') {
      const err = new Error('An academy with this short name already exists');
      err.statusCode = 409;
      err.code = 'ACADEMY_SHORT_NAME_DUPLICATE';
      throw err;
    }
  }
}
const insertAcademyToDB = async ({
  email,
  academy_number,
  name,
  short_name,
  type,
  description,
  website,
  logo_url,
  phone,
  legal_name,
  registration_number,
  tax_id,
  billing_email,
}) => {
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        email,
        academy_number,
        name,
        short_name,
        type,
        description,
        website,
        logo_url,
        phone,
        legal_name,
        registration_number,
        tax_id,
        billing_email
      )
      VALUES (
        $1,  $2,  $3,  $4,  $5,
        $6,  $7,  $8,  $9,  $10,
        $11, $12, $13
      )
      RETURNING
        id,
        email,
        academy_number,
        name,
        short_name,
        type,
        description,
        website,
        logo_url,
        phone,
        legal_name,
        registration_number,
        tax_id,
        billing_email`,
    [
      email,
      academy_number,
      name,
      short_name.toUpperCase(),
      type,
      description ?? null,
      website ?? null,
      logo_url ?? null,
      phone ?? null,
      legal_name ?? null,
      registration_number ?? null,
      tax_id ?? null,
      billing_email ?? null,
    ],
  );

  return { rows: [academy] };
};
const generateRandomAcademyNumber = async () => {
  const result = await db.query(`SELECT nextval('academy_seq')`);
  const seq = result.rows[0].nextval;

  const now = new Date();
  const date = now.toISOString().slice(2,10).replace(/-/g,'');

  const academy_number = `ACD_${date}${seq}`;

  return academy_number;
}


// Services
const createAcademyService = async (payload) => {
  const {
    email,
    name,
    short_name,
    type,
    description,
    website,
    logo_url,
    phone,
    legal_name,
    registration_number,
    tax_id,
    billing_email,
  } = payload;

  await ensureAcademyUnique(email, name, short_name);
  const academy_number = await generateRandomAcademyNumber();

  const { rows: [academy] } = await insertAcademyToDB({ ...payload, academy_number });

  return { academy: academyDto(academy) };
};

export { createAcademyService };