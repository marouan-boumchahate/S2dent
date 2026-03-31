import db from '../../config/db.js';

const ensureAcademyExists = async (academyId) => {
  const { rows } = await db.query(
    'SELECT id FROM academies WHERE id = $1 LIMIT 1',
    [academyId],
  );

  if (rows.length === 0) {
    const err = new Error('Academy not found for the given academy_id');
    err.statusCode = 404;
    err.code = 'ACADEMY_NOT_FOUND';
    throw err;
  }
};

const ensureDepartmentUniqueWithinAcademy = async (academyId, code, name) => {
  const [codeExists, nameExists] = await Promise.all([
    db.query(
      'SELECT id FROM departments WHERE academy_id = $1 AND code = $2 LIMIT 1',
      [academyId, code],
    ),
    db.query(
      'SELECT id FROM departments WHERE academy_id = $1 AND name = $2 LIMIT 1',
      [academyId, name],
    ),
  ]);

  if (codeExists.rows.length > 0) {
    const err = new Error('A department with this code already exists for this academy');
    err.statusCode = 409;
    err.code = 'DEPARTMENT_CODE_DUPLICATE';
    throw err;
  }

  if (nameExists.rows.length > 0) {
    const err = new Error('A department with this name already exists for this academy');
    err.statusCode = 409;
    err.code = 'DEPARTMENT_NAME_DUPLICATE';
    throw err;
  }
};

const insertDepartmentToDB = async ({
  academy_id,
  code,
  name,
  faculty,
  total_years,
  description,
  is_active,
}) => {
  const { rows: [department] } = await db.query(
    `INSERT INTO departments (
        academy_id,
        code,
        name,
        faculty,
        total_years,
        description,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, COALESCE($7, TRUE)
      )
      RETURNING
        id,
        academy_id,
        code,
        name,
        faculty,
        total_years,
        description,
        is_active,
        created_at,
        updated_at`,
    [
      academy_id,
      code,
      name,
      faculty,
      total_years,
      description ?? null,
      is_active ?? null,
    ]
  );

  return { rows: [department] };
};

const createDepartmentService = async (payload) => {
  const {
    academy_id,
    code,
    name,
    faculty,
    total_years,
    description,
    is_active,
  } = payload;

  await ensureAcademyExists(academy_id);
  await ensureDepartmentUniqueWithinAcademy(academy_id, code, name);

  const { rows: [department] } = await insertDepartmentToDB({ ...payload });

  return {
    department: {
      id: department.id,
      academy_id: department.academy_id,
      code: department.code,
      name: department.name,
      faculty: department.faculty,
      total_years: department.total_years,
      description: department.description,
      is_active: department.is_active
    },
  };
};

export { createDepartmentService };

