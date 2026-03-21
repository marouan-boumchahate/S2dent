import db from '../../config/db.js';

const ensureProfessorUnique = async (
    email,
    employeeId
) => {
  const [emailExists, employeeIdExists] = await Promise.all([
    db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]),
    db.query('SELECT id FROM professors WHERE employee_number = $1 LIMIT 1', [employeeId]),
  ]);

  if (emailExists.rows.length > 0) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    err.code = 'EMAIL_DUPLICATE';
    throw err;
  }

  if (employeeIdExists.rows.length > 0) {
    const err = new Error('A professor with this employee ID already exists');
    err.statusCode = 409;
    err.code = 'PROFESSOR_DUPLICATE';
    throw err;
  }
}

const insertUserToDB = async (
  email
) => {
  const { rows: [user] } = await db.query(
    `INSERT INTO users (email, role)
      VALUES ($1, 'professor')
      RETURNING id, email`,
    [email],
  );

  return { rows: [user] };
}

const insertProfessorToDB = async (
  userId,
  full_name,
  employee_number,
  phone,
  department,
  faculty,
  title,
  academy_id
) => {
  const { rows: [professor] } = await db.query(
    `INSERT INTO professors 
        (user_id, full_name, employee_number, phone, department, faculty, title, academy_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, full_name, employee_number, phone, department, faculty, title, academy_id`,
    [userId, full_name, employee_number, phone, department, faculty, title, academy_id],
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


const createProfessorService = async ({
  email, 
  full_name, 
  title, 
  department, 
  faculty, 
  phone,
  academy_id
}) => {
  const employeeId = await generateRandomEmployeeId();
  
  await ensureProfessorUnique(email, employeeId);
  
  const { rows: [user] } = await insertUserToDB(email);

  const { rows: [professor] } = await insertProfessorToDB(
      user.id, 
      full_name,
      employeeId,
      phone ?? null,
      department,
      faculty,
      title ?? null,
      academy_id
  );

  return {
      professor: {
          id: professor.id,
          name: professor.full_name,
          employee_number: professor.employee_number,
          phone: professor.phone,
          department: professor.department,
          faculty: professor.faculty,
          title: professor.title,
          academy_id: professor.academy_id
      },
  };
};

export { createProfessorService };