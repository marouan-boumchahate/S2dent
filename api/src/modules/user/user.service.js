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
const ensureUserUnique = async (email, nationalId) => {
  const { rows } = await db.query(
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
    SELECT i.is_active 
    FROM users 
    JOIN identities i ON users.id = i.user_id 
    WHERE users.id = $1 LIMIT 1`,
    [user_id]
  );

  if (!row || !row.is_active) {
    const err = new Error('No active user account found for the provided ID');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
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
  photo_url,
  notes,
}) => {
  const full_name = `${first_name} ${middle_name ? `${middle_name} ` : ''}${last_name}`.trim();

  const { rows: [user] } = await db.query(
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
          notes,
          nationality
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          notes,
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
        notes ?? null,
        nationality
      ],
  );

  return { rows: [user] };
}
const updateUserInDB = async ({ user_id, phone, photo_url, notes }) => {
  const { rows: [user] } = await db.query(
    `UPDATE users
        SET phone = COALESCE($1, phone),
            photo_url = COALESCE($2, photo_url),
            notes = COALESCE($3, notes)
      WHERE id = $4
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
        photo_url,
        notes`,
    [phone ?? null, photo_url ?? null, notes ?? null, user_id],
  );

  return { rows: [user] };
};


// Services
export const createUserService = async (payload) => {
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
    photo_url,
    notes,
  } = payload;

  await ensureUserUnique(email, national_id);

  const {rows: [user]} = await insertUserToDB({ ...payload });

  return { user: toUserDto(user) };
};
export const updateUserService = async (payload) => {
  const { user_id } = payload;

  await ensureUserExists(user_id);

  const { rows: [user] } = await updateUserInDB({ ...payload });

  return { user: toUserDto(user) };
};
