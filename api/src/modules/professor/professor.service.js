import db from '../../config/db.js';

// DTO
const professorDto = (p) => ({
  id: p.id,
  user_id: p.user_id,
  academy_id: p.academy_id,
  department_id: p.department_id,
  serial_number: p.employee_number,
  title: p.title,
  rank: p.rank,
  specialization: p.specialization,
  hire_date: p.hire_date,
  employment_type: p.employment_type,
  office_location: p.office_location,
  office_hours: p.office_hours,
  bio: p.bio,
  is_active: p.is_active
});
const ProfessorSummaryDto = (p) => ({
  id: p.id,
  wallet_address: p.wallet_address,
  name: p.full_name,
  department: p.department_name,
  last_transaction_status: p.last_transaction_status,
  issued_at: p.issued_at,
  is_revoked: p.revoked_at !== null,
  email: p.email
});


// Helpers
const ensureProfessorUnique = async (
  employeeNumber,
) => {
  const [employeeNumberExists] = await Promise.all([
    db.query('SELECT id FROM professors WHERE employee_number = $1 LIMIT 1', [employeeNumber]),
  ]);

  if (employeeNumberExists.rows.length > 0) {
    const err = new Error('A professor with this employee ID already exists');
    err.statusCode = 409;
    err.code = 'PROFESSOR_DUPLICATE';
    throw err;
  }
};
const ensureDepartmentExistsForAcademy = async (academy_id, department_id) => {
  const { rows } = await db.query(
    `SELECT 1 FROM departments WHERE id = $1 AND academy_id = $2 LIMIT 1`,
    [department_id, academy_id]
  );

  if (rows.length === 0) {
    const err = new Error('Department not found for the given academy_id');
    err.statusCode = 404;
    err.code = 'DEPARTMENT_NOT_FOUND';
    throw err;
  }
};
const ensureUserExists = async (user_id) => {
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE id = $1 LIMIT 1`,
    [user_id]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
};
const ensureProfessorExists = async (professor_id) => {
  const { rows: [row] } = await db.query(`
    SELECT 1
    FROM professors as p
    JOIN identities as i ON p.user_id = i.user_id
    WHERE p.id = $1
      AND i.role = 'professor'
      AND i.issued_at IS NOT NULL
      AND i.revoked_at IS NULL
    LIMIT 1
  `, [professor_id]);
    
  if (!row) {
    const err = new Error('No active professor account found for the provided ID');
    err.statusCode = 404;
    err.code = 'PROFESSOR_NOT_FOUND';
    throw err;
  }
};
const ensureAcademyExists = async (academy_id) => {
  const { rows: [academy] } = await db.query(
    `SELECT id 
     FROM identities 
     WHERE academy_id = $1
       AND role = 'academy'
       AND issued_at IS NOT NULL
       AND revoked_at IS NULL
     LIMIT 1`,
    [academy_id],
  );

  if (!academy) {
    const err = new Error('Academy has no active identity');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }
};

const generateRandomEmployeeId = async () => {
  const result = await db.query(`SELECT nextval('employee_seq')`);
  const seq = result.rows[0].nextval;

  const now = new Date();
  const date = now.toISOString().slice(2,10).replace(/-/g,'');

  const employeeId = `EMP_${date}${seq}`;

  return employeeId;
}

const insertProfessorToDB = async ({
  user_id,
  academy_id,
  department_id,
  employee_number,
  title,
  rank,
  specialization,
  hire_date,
  employment_type,
  office_location,
  office_hours,
  bio
}) => await db.query(
    `INSERT INTO professors (
        user_id,
        academy_id,
        department_id,
        employee_number,
        title,
        rank,
        specialization,
        hire_date,
        employment_type,
        office_location,
        office_hours,
        bio
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12
      )
      RETURNING
        id,
        user_id,
        academy_id,
        department_id,
        employee_number,
        title,
        rank,
        specialization,
        hire_date,
        employment_type,
        office_location,
        office_hours,
        bio,
        is_active`,
    [
      user_id,
      academy_id,
      department_id,
      employee_number,
      title,
      rank ?? null,
      specialization ?? null,
      hire_date ?? new Date(),
      employment_type ?? 'full_time',
      office_location ?? null,
      office_hours ?? null,
      bio ?? null
    ],
  );
const updateProfessorInDB = async ({
  professor_id,
  rank,
  employment_type,
  office_location,
  office_hours,
  bio
}) => await db.query(
  `UPDATE professors SET
     rank = COALESCE($1, rank),
     employment_type = COALESCE($2, employment_type),
     office_location = COALESCE($3, office_location),
     office_hours = COALESCE($4, office_hours),
     bio = COALESCE($5, bio)
   WHERE id = $6
   RETURNING id, user_id, academy_id, department_id, employee_number,
             title, rank, specialization, hire_date, employment_type,
             office_location, office_hours, bio, is_active`,
  [
    rank ?? null,
    employment_type ?? null,
    office_location ?? null,
    office_hours ?? null,
    bio ?? null,
    professor_id
  ]
);
const getProfessorsFromDB = async (academy_id) => {
  const { rows } = await db.query(
    `SELECT
        p.id,
        u.full_name,
        u.email,
        d.name AS department_name,
        i.wallet_address,
        i.revoked_at,
        i.issued_at,
        pt.status AS last_transaction_status
      FROM professors p
      JOIN users u ON u.id = p.user_id
      JOIN departments d ON d.id = p.department_id
      JOIN identities i ON i.user_id = u.id AND i.role = 'professor'
      JOIN pending_transactions pt
        ON pt.tx_hash = COALESCE(i.revoke_identity_tx_hash, i.issue_identity_tx_hash)
      WHERE d.academy_id = $1
      ORDER BY u.full_name ASC`,
    [academy_id]
  );

  return rows;
};
const getProfessorsNamesFromDB = async (academy_id) => {
  const { rows } = await db.query(
    `SELECT
        p.id,
        u.full_name
      FROM professors p
      JOIN users u ON u.id = p.user_id
      JOIN departments d ON d.id = p.department_id
      JOIN identities i ON i.user_id = u.id AND i.role = 'professor' AND i.status = 'issued'
      WHERE d.academy_id = $1
      ORDER BY u.full_name ASC`,
    [academy_id]
  );

  return rows;
};
const getProfessorFromDB = async (professor_id) => {
  const { rows: [professor] } = await db.query(`
    SELECT
      p.id,
      p.user_id,
      p.academy_id,
      p.department_id,
      p.employee_number,
      p.title,
      p.rank,
      p.specialization,
      p.hire_date,
      p.employment_type,
      p.office_location,
      p.office_hours,
      p.bio,
      p.is_active
    FROM professors AS p
    JOIN identities i ON p.user_id = i.user_id AND i.role = 'professor'
    WHERE p.id = $1
      AND i.issued_at IS NOT NULL
      AND i.revoked_at IS NULL
    LIMIT 1
  `, [professor_id]);

  if (!professor) {
    const err = new Error('No professor account found for the provided ID');
    err.statusCode = 404;
    err.code = 'PROFESSOR_NOT_FOUND';
    throw err;
  }

  return professor;
}

// Service functions
const createProfessorService = async (payload) => {
  const {
    user_id,
    academy_id,
    department_id,
  } = payload;

  await ensureUserExists(user_id);
  await ensureAcademyExists(academy_id);
  await ensureDepartmentExistsForAcademy(academy_id, department_id);

  const employeeNumber = await generateRandomEmployeeId();
  await ensureProfessorUnique(employeeNumber);

  const { rows: [professor] } = await insertProfessorToDB({
    ...payload,
    employee_number: employeeNumber,
  });

  return { professor: professorDto(professor) };
};
const updateProfessorService = async (payload) => {
  const { professor_id } = payload;

  await ensureProfessorExists(professor_id);

  const { rows: [professor] } = await updateProfessorInDB(payload);

  return { professor: professorDto(professor) };
};
const fetchAllProfessorsService = async (academy_id) => {
  const professors = await getProfessorsFromDB(academy_id);
  return { professors: professors.map((professor) => ProfessorSummaryDto(professor)) };
};
const fetchAllProfessorsNamesService = async (academy_id) => {
  const professors = await getProfessorsNamesFromDB(academy_id);
  return professors;
};
const fetchProfessorService = async (professor_id) => {
  const professor = await getProfessorFromDB(professor_id);
  return { professor: professorDto(professor) };
}


export { 
  createProfessorService, 
  updateProfessorService, 
  fetchAllProfessorsService, 
  fetchAllProfessorsNamesService,
  fetchProfessorService 
};