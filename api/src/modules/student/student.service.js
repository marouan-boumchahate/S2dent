import db from '../../config/db.js';


// DTO
const toStudentDto = (student) => ({
  id: student.id,
  user_id: student.user_id,
  academy_id: student.academy_id,
  department_id: student.department_id,
  advisor_id: student.advisor_id,
  advisor_name: student.advisor_name,
  student_number: student.student_number,
  current_level: new Date().getFullYear() - new Date(student.enrollment_date).getFullYear() + 1,
  enrollment_status: student.enrollment_status,
  cgpa: student.cgpa,
  enrollment_date: student.enrollment_date,
  expected_graduation_date: student.expected_graduation_date,
  actual_graduation_date: student.actual_graduation_date,
});
const StudentSummaryDto = (student) => ({
  id: student.id,
  wallet_address: student.wallet_address,
  name: student.full_name,
  serial_number: student.student_number,
  department: student.department_name,
  advisor_name: student.advisor_name,
  last_transaction_status: student.last_transaction_status,
  issued_at: student.issued_at,
  is_revoked: student.revoked_at !== null,
  email: student.email,
});


// Helpers
const ensureStudentUnique = async (
  studentNumber,
) => {
  const [studentNumberExists] = await Promise.all([
    db.query('SELECT id FROM students WHERE student_number = $1 LIMIT 1', [studentNumber]),
  ]);

  if (studentNumberExists.rows.length > 0) {
    const err = new Error('A student with this student number already exists');
    err.statusCode = 409;
    err.code = 'STUDENT_NUMBER_DUPLICATE';
    throw err;
  }
};
const ensureUserExists = async (user_id) => {
  const { rows } = await db.query(
    'SELECT 1 FROM users WHERE id = $1 LIMIT 1',
    [user_id],
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
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
const ensureAdvisorExists = async (advisor_id, academy_id) => {
  const { rows: [row] } = await db.query(
    `SELECT 1
     FROM professors p
     JOIN identities i ON p.user_id = i.user_id
     WHERE p.id = $1
       AND p.academy_id = $2
       AND i.role = 'professor'
       AND i.issued_at IS NOT NULL
       AND i.revoked_at IS NULL
     LIMIT 1`,
    [advisor_id, academy_id],
  );

  if (!row) {
    const err = new Error('Advisor not found for the provided academy');
    err.statusCode = 404;
    err.code = 'PROFESSOR_NOT_FOUND';
    throw err;
  }
};
const generateStudentNumber = async () => {
    const result = await db.query(`SELECT nextval('student_seq')`);
    const seq = result.rows[0].nextval;
  
    const now = new Date();
    const date = now.toISOString().slice(2,10).replace(/-/g,'');
  
    const studentNumber = `STU_${date}${seq}`;
  
    return studentNumber;
};
const getDepartmentGraduationYears = async (department_id) => {
  const { rows: [department] } = await db.query(
    `SELECT * FROM departments WHERE id = $1`,
    [department_id]
  );

  return department;
}
const ensureStudentExists = async (student_id) => {
  const { rows: [row] } = await db.query(`
    SELECT s.academy_id
    FROM students s
    JOIN identities i ON s.user_id = i.user_id
    WHERE s.id = $1
      AND i.role = 'student'
      AND i.issued_at IS NOT NULL
      AND i.revoked_at IS NULL
    LIMIT 1
  `, [student_id]);


  if (!row) {
    const err = new Error('No active student account found for the provided ID');
    err.statusCode = 403;
    err.code = 'STUDENT_NOT_FOUND';
    throw err;
  }

  return row;
}

const getStudentsFromDB = async (role_id, role) => {
  let clause = '';
  switch(role) {
    case 'professor':
      clause = 's.advisor_id = $1';
      break;
    case 'academy':
      clause = 's.academy_id = $1';
      break;
    default:
      const err = new Error('Invalid requester role');
      err.statusCode = 400;
      err.code = 'INVALID_REQUESTER_ROLE';
      throw err;
  }

  const { rows } = await db.query(
    `SELECT
        s.id,
        u.full_name,
        u.email,
        s.student_number,
        d.name AS department_name,
        up.full_name AS advisor_name,
        i.wallet_address,
        i.revoked_at,
        i.issued_at,
        pt.status AS last_transaction_status
      FROM students s
      JOIN professors p ON p.id = s.advisor_id
      JOIN users up ON up.id = p.user_id
      JOIN users u ON u.id = s.user_id
      JOIN departments d ON d.id = s.department_id
      JOIN identities i ON i.user_id = u.id AND i.role = 'student'
      JOIN pending_transactions pt
        ON pt.tx_hash = COALESCE(i.revoke_identity_tx_hash, i.issue_identity_tx_hash)
      WHERE ${clause}
      ORDER BY u.full_name ASC`,
    [role_id],
  );

  return rows;
};
const getStudentFromDB = async (student_id, requester_id, requester_role) => {
  let clause = '';
  let params = [student_id];

  if (requester_id && requester_role) {
    switch(requester_role) {
      case 'professor':
        clause = 'AND s.advisor_id = $2';
        params.push(requester_id);
        break;
      case 'academy':
        clause = 'AND s.academy_id = $2';
        params.push(requester_id);
        break;
      default:
        const err = new Error('Invalid requester role');
        err.statusCode = 400;
        err.code = 'INVALID_REQUESTER_ROLE';
        throw err;
    }
  }

  const { rows: [student] } = await db.query(`
    SELECT
      s.id,
      s.user_id,
      s.academy_id,
      s.department_id,
      s.advisor_id,
      u.full_name as advisor_name,
      s.student_number,
      s.cgpa,
      s.enrollment_status,
      s.enrollment_date,
      s.expected_graduation_date,
      s.actual_graduation_date
    FROM students AS s
    JOIN identities i ON s.user_id = i.user_id AND i.role = 'student'
    JOIN professors p ON s.advisor_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE s.id = $1
      AND i.issued_at IS NOT NULL
      ${clause}
    LIMIT 1
  `, params);

  if (!student) {
    const err = new Error('No active student account found for the provided ID');
    err.statusCode = 404;
    err.code = 'STUDENT_NOT_FOUND';
    throw err;
  }

  return student;
};

const insertStudentToDB = async ({
  user_id,
  academy_id,
  department_id,
  advisor_id,
  student_number,
  current_level,
  enrollment_status,
  enrollment_date,
  total_years_to_graduate,
  actual_graduation_date,
}) => await db.query(`
    INSERT INTO students (
      user_id,
      academy_id,
      department_id,
      advisor_id,
      student_number,
      enrollment_status,
      enrollment_date,
      expected_graduation_date,
      actual_graduation_date
    ) VALUES (
      $1, $2, $3, $4, $5,
      COALESCE($6::enrollment_status, 'active'::enrollment_status),
      COALESCE($7::date, CURRENT_DATE),
      COALESCE($7::date, CURRENT_DATE) + make_interval(years => $8),
      $9
    ) RETURNING *`,
    [
      user_id,
      academy_id,
      department_id,
      advisor_id ?? null,
      student_number,
      enrollment_status ?? null,
      enrollment_date ?? null,
      total_years_to_graduate,
      actual_graduation_date ?? null,
    ],
  );
const updateStudentToDB = async ({
  student_id,
  cgpa,
  advisor_id
}) => await db.query(
    `UPDATE students
      SET cgpa = COALESCE($2, cgpa),
          advisor_id = COALESCE($3, advisor_id)
      WHERE id = $1
      RETURNING *`,
    [student_id, cgpa, advisor_id ?? null],
  );


// Services
export const createStudentService = async (payload) => {
  const {
    user_id,
    academy_id,
    department_id,
    advisor_id,
    current_level,
    enrollment_status,
    enrollment_date,
    actual_graduation_date
  } = payload;

  await ensureUserExists(user_id);
  await ensureAcademyExists(academy_id);
  if (advisor_id) await ensureAdvisorExists(advisor_id, academy_id);
  const department = await getDepartmentGraduationYears(department_id);
  
  const studentNumber = await generateStudentNumber();
  await ensureStudentUnique(studentNumber);


  const { rows: [student] } = await insertStudentToDB({
    ...payload,
    student_number: studentNumber,
    total_years_to_graduate: department.total_years
  })

  return { student: toStudentDto(student) };
};
export const updateStudentService = async (payload) => {
  const { student_id, cgpa, advisor_id } = payload;

  const existingStudent = await ensureStudentExists(student_id);
  if (advisor_id) await ensureAdvisorExists(advisor_id, existingStudent.academy_id);

  const { rows: [student] } = await updateStudentToDB({
    student_id,
    cgpa,
    advisor_id
  });

  return { student: toStudentDto(student) };
};
const fetchAllStudentsService = async (role_id, role) => {
  const students = await getStudentsFromDB(role_id, role);
  return { students: students.map((student) => StudentSummaryDto(student)) };
};
const fetchStudentService = async ({ student_id, requester_id, requester_role }) => {
  const student = await getStudentFromDB(student_id, requester_id, requester_role);
  return { student: toStudentDto(student) };
};

export { fetchAllStudentsService, fetchStudentService };