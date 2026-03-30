import db from '../../config/db.js';

const ensureStudentUnique = async (
  email,
  nationalId,
  studentNumber,
) => {
  const [emailExists, nationalIdExists, studentNumberExists] = await Promise.all([
    db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM students WHERE national_id = $1 LIMIT 1', [nationalId]),
    db.query('SELECT id FROM students WHERE student_number = $1 LIMIT 1', [studentNumber]),
  ]);

  if (emailExists.rows.length > 0) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    err.code = 'EMAIL_DUPLICATE';
    throw err;
  }

  if (nationalIdExists.rows.length > 0) {
    const err = new Error('A student with this national ID already exists');
    err.statusCode = 409;
    err.code = 'STUDENT_NATIONAL_ID_DUPLICATE';
    throw err;
  }

  if (studentNumberExists.rows.length > 0) {
    const err = new Error('A student with this student number already exists');
    err.statusCode = 409;
    err.code = 'STUDENT_NUMBER_DUPLICATE';
    throw err;
  }
};

const insertUserToDB = async (email) => {
  const {
    rows: [user],
  } = await db.query(
    `INSERT INTO users (email, role)
      VALUES ($1, 'student')
      RETURNING id, email`,
    [email],
  );

  return { rows: [user] };
};

const generateStudentNumber = async () => {
    const result = await db.query(`SELECT nextval('student_seq')`);
    const seq = result.rows[0].nextval;
  
    const now = new Date();
    const date = now.toISOString().slice(2,10).replace(/-/g,'');
  
    const studentNumber = `STU_${date}${seq}`;
  
    return studentNumber;
};

const insertStudentToDB = async ({
  user_id,
  academy_id,
  student_number,
  first_name,
  middle_name,
  last_name,
  date_of_birth,
  gender,
  national_id,
  phone,
  address,
  country,
  city,
  department,
  faculty,
  current_level,
  actual_study_duration_in_years,
  actual_graduation_date,
  photo_url,
  notes,
}) => {
  const full_name = `${first_name} ${middle_name ? `${middle_name} ` : ''}${last_name}`.trim();

  const {
    rows: [student],
  } = await db.query(
    `INSERT INTO students (
        user_id,
        academy_id,
        student_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        date_of_birth,
        gender,
        national_id,
        phone,
        address,
        country,
        city,
        department,
        faculty,
        current_level,
        actual_study_duration_in_years,
        enrollment_status,
        enrollment_date,
        expected_graduation_date,
        actual_graduation_date,
        photo_url,
        notes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        'active',
        CURRENT_DATE,
        CURRENT_DATE + make_interval(years => $18),
        $19,
        $20,
        $21
      )
      RETURNING
        id,
        user_id,
        academy_id,
        student_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        date_of_birth,
        gender,
        national_id,
        phone,
        address,
        country,
        city,
        department,
        faculty,
        current_level,
        actual_study_duration_in_years,
        enrollment_status,
        enrollment_date,
        expected_graduation_date,
        actual_graduation_date,
        photo_url,
        notes`,
    [
      user_id,
      academy_id,
      student_number,
      first_name,
      middle_name ?? null,
      last_name,
      full_name,
      date_of_birth,
      gender,
      national_id,
      phone ?? null,
      address ?? null,
      country,
      city,
      department,
      faculty,
      current_level,
      actual_study_duration_in_years,
      actual_graduation_date ?? null,
      photo_url ?? null,
      notes ?? null,
    ],
  );

  return { rows: [student] };
};

export const createStudentService = async (payload) => {
  const {
    email,
    national_id,
  } = payload;

  const studentNumber = await generateStudentNumber();

  await ensureStudentUnique(email, national_id, studentNumber);

  const {
    rows: [user],
  } = await insertUserToDB(email);

  const {
    rows: [student],
  } = await insertStudentToDB({
    ...payload,
    user_id: user.id,
    student_number: studentNumber,
  });

  return {
    student: {
      id: student.id,
      student_number: student.student_number,
      first_name: student.first_name,
      middle_name: student.middle_name,
      last_name: student.last_name,
      full_name: student.full_name,
      gender: student.gender,
      national_id: student.national_id,
      email: user.email,
      phone: student.phone,
      address: student.address,
      country: student.country,
      city: student.city,
      department: student.department,
      faculty: student.faculty,
      current_level: student.current_level,
      enrollment_status: student.enrollment_status,
      enrollment_date: student.enrollment_date,
      expected_graduation_date: student.expected_graduation_date,
      photo_url: student.photo_url,
      notes: student.notes,
      academy_id: student.academy_id,
    },
  };
};