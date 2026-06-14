import db from '../../config/db.js';


// DTO
const toUserDto = (u) => ({
  id: u.id,
  first_name: u.first_name,
  middle_name: u.middle_name,
  last_name: u.last_name,
  full_name: u.full_name,
  date_of_birth: u.date_of_birth,
  gender: u.gender,
  nationality: u.nationality,
  national_id: u.national_id,
  email: u.email,
  phone: u.phone,
  photo_url: u.photo_url,
  notes: u.notes,
});


// Helpers
const ensureUserUnique = async (email, nationalId, client = db) => {
  const { rows } = await client.query(
    'SELECT id FROM users WHERE email = $1 OR national_id = $2 LIMIT 1',
    [email, nationalId],
  );

  if (rows.length > 0) {
    const err = new Error('A user with this email or national ID already exists');
    err.statusCode = 409;
    err.code = 'USER_NOT_UNIQUE';
    throw err;
  }
};
const ensureUserExists = async (user_id) => {
  const { rows: [row] } = await db.query(`
    SELECT 1 
    FROM users 
    JOIN identities i ON users.id = i.user_id 
    WHERE users.id = $1
      AND i.issued_at IS NOT NULL
      AND i.revoked_at IS NULL
    LIMIT 1`,
    [user_id]
  );

  if (!row) {
    const err = new Error('No active user account found for the provided ID');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
};

const getUserFromDB = async (user_id) => {
  const { rows: [user] } = await db.query(
    `SELECT
        u.id,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.full_name,
        u.date_of_birth,
        u.gender,
        u.nationality,
        u.national_id,
        u.email,
        u.phone,
        u.photo_url
      FROM users AS u
      JOIN identities i ON u.id = i.user_id
      WHERE u.id = $1
        AND i.issued_at IS NOT NULL
      LIMIT 1`,
    [user_id],
  );

  if (!user) {
    const err = new Error('No active user account found for the provided ID');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  return user;
};

const insertUserToDB = async ({
  first_name,
  middle_name,
  last_name,
  date_of_birth,
  gender,
  nationality,
  national_id,
  email,
  phone,
  photo_url
}, client = db) => {
  const full_name = `${first_name} ${middle_name ? `${middle_name} ` : ''}${last_name}`.trim();

  const { rows: [user] } = await client.query(
    `INSERT INTO users (
          first_name,
          middle_name,
          last_name,
          full_name,
          date_of_birth,
          gender,
          national_id,
          email,
          phone,
          photo_url,
          nationality
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          first_name,
          middle_name,
          last_name,
          full_name,
          date_of_birth,
          gender,
          national_id,
          email,
          phone,
          photo_url,
          nationality`,
      [
        first_name,
        middle_name ?? null,
        last_name,
        full_name,
        date_of_birth,
        gender,
        national_id,
        email,
        phone ?? null,
        photo_url ?? null,
        nationality
      ],
  );

  return { rows: [user] };
}
const updateUserInDB = async ({
  user_id,
  phone,
  photo_url,
}) => {
  const { rows: [user] } = await db.query(
    `UPDATE users
        SET phone = COALESCE($1, phone),
            photo_url = COALESCE($2, photo_url)
      WHERE id = $3
      RETURNING
        id,
        first_name,
        middle_name,
        last_name,
        full_name,
        date_of_birth,
        gender,
        nationality,
        national_id,
        email,
        phone,
        photo_url`,
    [phone ?? null, photo_url ?? null, user_id],
  );

  return { rows: [user] };
};


// Services
export const createUserService = async (payload, client = db) => {
  const {
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    nationality,
    national_id,
    email,
    phone,
    photo_url
  } = payload;

  await ensureUserUnique(email, national_id, client);

  const {rows: [user]} = await insertUserToDB({ ...payload }, client);

  return { user: toUserDto(user) };
};
export const updateUserService = async (payload) => {
  const { user_id } = payload;

  await ensureUserExists(user_id);

  const { rows: [user] } = await updateUserInDB({ ...payload });

  return { user: toUserDto(user) };
};
export const fetchUserService = async (user_id) => {
  const user = await getUserFromDB(user_id);

  return { user: toUserDto(user) };
};
