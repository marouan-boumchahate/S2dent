import db from '../../config/db.js';

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

const insertStudentToDB = async ({
  user_id,
  academy_id,
  department_id,
  student_number,
  current_level,
  total_years_to_graduate,
  actual_graduation_date,
}) => {
  const {
    rows: [student],
  } = await db.query(
    `INSERT INTO students (
        user_id,
        academy_id,
        department_id,
        student_number,
        current_level,
        enrollment_status,
        enrollment_date,
        expected_graduation_date,
        actual_graduation_date
      )
      VALUES (
        $1, $2, $3, $4, $5,
        'active',
        CURRENT_DATE,
        CURRENT_DATE + make_interval(years => $6),
        $7
      )
      RETURNING
        id,
        user_id,
        academy_id,
        department_id,
        student_number,
        current_level,
        enrollment_status,
        enrollment_date,
        expected_graduation_date,
        actual_graduation_date`,
    [
      user_id,
      academy_id,
      department_id,
      student_number,
      current_level,
      total_years_to_graduate,
      actual_graduation_date ?? null,
    ],
  );

  return { rows: [student] };
};

export const createStudentService = async (payload) => {
  const {
    user_id,
    academy_id,
    department_id,
    current_level,
    actual_graduation_date
  } = payload;

  const studentNumber = await generateStudentNumber();
  await ensureStudentUnique(studentNumber);

  const department = await getDepartmentGraduationYears(department_id);

  const { rows: [student] } = await insertStudentToDB({
    ...payload,
    student_number: studentNumber,
    total_years_to_graduate: department.total_years
  })

  return {
    student: {
      id: student.id,
      student_number: student.student_number,
      department_name: department.name,
      department_code: department.code,
      enrollment_status: student.enrollment_status,
      current_level: student.current_level,
      enrollment_date: student.enrollment_date,
      expected_graduation_date: student.expected_graduation_date,
      actual_graduation_date: student.actual_graduation_date
    }
  }

};