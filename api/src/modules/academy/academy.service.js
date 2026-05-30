import db from '../../config/db.js';


// DTOs
const academyDto = (academy) => ({
  id: academy.id,
  serial_number: academy.academy_number,
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
const academySummaryDto = (academy) => ({
  id: academy.id,
  serial_number: academy.academy_number,
  wallet_address: academy.wallet_address,
  name: academy.name,
  short_name: academy.short_name,
  type: academy.type,
  email: academy.email,
  issued_at: academy.issued_at,
  is_revoked: academy.revoke_at !== null,
  last_transaction_status: academy.status,
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
const updateAcademyInDB = async ({
  academy_id,
  description,
  logo_url,
  phone,
  website,
}) => {
  const result = await db.query(
    `UPDATE academies
      SET description = COALESCE($2, description),
          logo_url = COALESCE($3, logo_url),
          phone = COALESCE($4, phone),
          website = COALESCE($5, website)
      WHERE id = $1
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
    [academy_id, description ?? null, logo_url ?? null, phone ?? null, website ?? null],
  );

  return result;
};
const generateRandomAcademyNumber = async () => {
  const result = await db.query(`SELECT nextval('academy_seq')`);
  const seq = result.rows[0].nextval;

  const now = new Date();
  const date = now.toISOString().slice(2,10).replace(/-/g,'');

  const academy_number = `ACD_${date}${seq}`;

  return academy_number;
}
const getAcademyById = async (academyId) => {
  const { rows: [academy] } = await db.query(
    `SELECT
        a.id,
        a.academy_number,
        a.email,
        a.name,
        a.short_name,
        a.type,
        a.description,
        a.website,
        a.logo_url,
        a.phone,
        a.legal_name,
        a.registration_number,
        a.tax_id,
        a.billing_email
      FROM academies AS a
      JOIN identities AS i
        ON i.academy_id = a.id
        AND i.role = 'academy'
        AND i.issued_at IS NOT NULL
      WHERE a.id = $1
      LIMIT 1`,
    [academyId],
  );

  if (!academy) {
    const err = new Error('Academy not found');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }

  return academy;
};
const getAcademies = async () => {
  const { rows } = await db.query(
    `SELECT
        a.id,
        a.academy_number,
        a.email,
        a.name,
        a.short_name,
        a.type,
        i.wallet_address,
        i.issued_at,
        i.revoked_at,
        pt.status
      FROM academies a
      JOIN identities i 
        ON i.academy_id = a.id AND i.role = 'academy'
      JOIN pending_transactions pt 
        ON pt.tx_hash = COALESCE(i.revoke_identity_tx_hash, i.issue_identity_tx_hash)
      ORDER BY a.name DESC`,
  );

  return rows;
}
const ensureAcademyExists = async (academyId) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (!uuidRegex.test(academyId)) {
    const err = new Error('Academy not found or does not have an active identity');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }

  const { rows } = await db.query(
    `SELECT 1 
     FROM academies a
     JOIN identities i 
      ON i.academy_id = a.id AND i.role = 'academy' AND i.revoked_at IS NULL AND i.issued_at IS NOT NULL
     WHERE a.id = $1 LIMIT 1`,
    [academyId],
  );

  if (rows.length === 0) {
    const err = new Error('Academy not found or does not have an active identity');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }
}
const getUserAcademyId = async (role_id, role) => {
  let clause;
  switch(role) {
    case 'professor':
      clause = 'JOIN professors p ON p.academy_id = a.id AND p.id = $1';
      break;
    case 'student':
      clause = 'JOIN students s ON s.academy_id = a.id AND s.id = $1';
      break;
    default:
      const err = new Error('Invalid role for academy summary');
      err.statusCode = 400;
      err.code = 'INVALID_ROLE';
      throw err;
  }

  const { rows: [academy] } = await db.query(
    `SELECT
        a.id,
        a.email,
        a.name,
        a.short_name,
        a.description,
        a.website,
        a.logo_url,
        a.phone
      FROM academies AS a
      ${clause}
      LIMIT 1`,
    [role_id],
  );

  if (!academy) {
    const err = new Error('Academy not found or does not have an active identity');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }

  return academy;
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
const updateAcademyService = async ({
  academy_id,
  description,
  logo_url,
  phone,
  website,
}) => {
  await ensureAcademyExists(academy_id);
  const { rows: [academy] } = await updateAcademyInDB({
    academy_id,
    description,
    logo_url,
    phone,
    website,
  });

  return { academy: academyDto(academy) };
};
const fetchAllAcademiesService = async () => {
  const academies = await getAcademies();
  return { academies: academies.map(academySummaryDto) };
};
const fetchAcademyByIdService = async (academyId) => {
  const academy = await getAcademyById(academyId);
  return { academy: academyDto(academy) };
}
const fetchAcademySummaryService = async (role_id, role) => 
  await getUserAcademyId(role_id, role);


export {
  createAcademyService,
  fetchAllAcademiesService,
  fetchAcademyByIdService,
  fetchAcademySummaryService,
  updateAcademyService,
};