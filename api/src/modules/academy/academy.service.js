import db from '../../config/db.js';
import { ethers } from 'ethers';


// Helpers
const ensureAcademyUnique = async (
  wallet_address,
  email,
  name,
  short_name
) => {
  const [walletExists, emailExists, nameExists, shortNameExists] = await Promise.all([
    db.query('SELECT id FROM academies WHERE wallet_address = $1 LIMIT 1', [wallet_address]),
    db.query('SELECT id FROM academies WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM academies WHERE name = $1 LIMIT 1', [name]),
    db.query('SELECT id FROM academies WHERE short_name = $1 LIMIT 1', [short_name.toUpperCase()]),
  ]);

  if (walletExists.rows.length > 0) {
    const err = new Error('An academy with this wallet address already exists');
    err.statusCode = 409;
    err.code = 'ACADEMY_WALLET_DUPLICATE';
    throw err;
  }

  if (emailExists.rows.length > 0) {
    const err = new Error('An academy with this email already exists');
    err.statusCode = 409;
    err.code = 'ACADEMY_EMAIL_DUPLICATE';
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
const insertAcademyToDB = async ({
  wallet_address,
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
        wallet_address,
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
        $11, $12, $13, $14
      )
      RETURNING
        id,
        wallet_address,
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
      wallet_address,
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
    wallet_address,
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

  const checksumAddr = ethers.getAddress(wallet_address);

  await ensureAcademyUnique(checksumAddr, email, name, short_name);
  const academy_number = await generateRandomAcademyNumber();

  const { rows: [academy] } = await insertAcademyToDB({
    ...payload,
    academy_number,
    wallet_address: checksumAddr,
  });

  return {
    academy: {
      id: academy.id,
      wallet_address: academy.wallet_address,
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
    },
  };
};

export { createAcademyService };