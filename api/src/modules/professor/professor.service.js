import db from '../../config/db.js';

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

const ensureAcademyExists = async (academy_id) => {
  const { rows } = await db.query(
    `SELECT 1 FROM academies WHERE id = $1 LIMIT 1`,
    [academy_id]
  );
  if (rows.length === 0) {
    const err = new Error('Academy not found');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }
};

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
}) => {
  const { rows: [professor] } = await db.query(
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
        bio`,
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

  return { rows: [professor] };
};

const generateRandomEmployeeId = async () => {
  const result = await db.query(`SELECT nextval('employee_seq')`);
  const seq = result.rows[0].nextval;

  const now = new Date();
  const date = now.toISOString().slice(2,10).replace(/-/g,'');

  const employeeId = `EMP_${date}${seq}`;

  return employeeId;
}

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

  return {
    professor: {
      id: professor.id,
      user_id: professor.user_id,
      academy_id: professor.academy_id,
      department_id: professor.department_id,
      employee_number: professor.employee_number,
      title: professor.title,
      rank: professor.rank,
      employment_type: professor.employment_type,
      hire_date: professor.hire_date
    },
  };
};

export { createProfessorService };