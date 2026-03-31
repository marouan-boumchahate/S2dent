import db from '../../config/db.js';

const ensureUserUnique = async (email, nationalId) => {
  const [emailExists, nationalIdExists] = await Promise.all([
    db.query('SELECT id FROM tusers WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM tusers WHERE national_id = $1 LIMIT 1', [nationalId]),
  ]);

  if (emailExists.rows.length > 0) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    err.code = 'EMAIL_DUPLICATE';
    throw err;
  }

  if (nationalIdExists.rows.length > 0) {
    const err = new Error('A user with this national ID already exists');
    err.statusCode = 409;
    err.code = 'USER_NATIONAL_ID_DUPLICATE';
    throw err;
  }
};

const insertUserToDB = async ({
  first_name,
  middle_name,
  last_name,
  date_of_birth,
  gender,
  national_id,
  email,
  phone,
  photo_url,
  notes,
}) => {
  const full_name = `${first_name} ${middle_name ? `${middle_name} ` : ''}${last_name}`.trim();

  const { rows: [user] } = await db.query(
    `INSERT INTO tusers (
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
          notes
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
          notes`,
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
      ],
  );

  return { rows: [user] };
}

export const createUserService = async (payload) => {
  const {
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    national_id,
    email,
    phone,
    photo_url,
    notes,
  } = payload;

  await ensureUserUnique(email, national_id);

  const {rows: [user]} = await insertUserToDB({ ...payload });

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      national_id: user.national_id,
      email: user.email,
      phone: user.phone
    }
  }
};
