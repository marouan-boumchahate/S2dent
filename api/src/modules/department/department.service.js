import db from '../../config/db.js';


// DTO
const toDepartmentDto = (department) => ({
  id: department.id,
  academy_id: department.academy_id,
  code: department.code,
  name: department.name,
  faculty: department.faculty,
  total_years: department.total_years,
  description: department.description,
  is_active: department.is_active,
});


// Helpers
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
const ensureDepartmentUniqueWithinAcademy = async (
  academyId,
  code,
  name,
  excludeId = null,
) => {
  const codeQuery = code
    ? db.query(
        `SELECT id FROM departments
         WHERE academy_id = $1 AND code = $2
         ${excludeId ? 'AND id <> $3' : ''}
         LIMIT 1`,
        excludeId ? [academyId, code, excludeId] : [academyId, code],
      )
    : Promise.resolve({ rows: [] });

  const nameQuery = name
    ? db.query(
        `SELECT id FROM departments
         WHERE academy_id = $1 AND name = $2
         ${excludeId ? 'AND id <> $3' : ''}
         LIMIT 1`,
        excludeId ? [academyId, name, excludeId] : [academyId, name],
      )
    : Promise.resolve({ rows: [] });

  const [codeExists, nameExists] = await Promise.all([codeQuery, nameQuery]);

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
const ensureDepartmentExists = async (department_id) => {
  const department = await getDepartmentByIdFromDB(department_id);

  if (!department) {
    const err = new Error('Department not found');
    err.statusCode = 404;
    err.code = 'DEPARTMENT_NOT_FOUND';
    throw err;
  }

  return department;
};

const getDepartmentByIdFromDB = async (department_id) => {
  const { rows: [department] } = await db.query(
    `SELECT
      id,
      academy_id,
      code,
      name,
      faculty,
      total_years,
      description,
      is_active
     FROM departments
     WHERE id = $1
     LIMIT 1`,
    [department_id],
  );

  return department;
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
const listDepartmentsFromDB = async (academy_id) => {
  const { rows } = await db.query(
    `SELECT
      id,
      academy_id,
      code,
      name,
      faculty,
      total_years,
      description,
      is_active
     FROM departments
     WHERE academy_id = $1
     ORDER BY name ASC`,
    [academy_id],
  );

  return { rows };
};
const updateDepartmentInDB = async ({
  department_id,
  description,
}) => {
  const { rows: [department] } = await db.query(
    `UPDATE departments
     SET description = COALESCE($1, description),
         updated_at = NOW()
     WHERE id = $2
     RETURNING
       id,
       academy_id,
       code,
       name,
       faculty,
       total_years,
       description,
       is_active`,
    [
      description ?? null,
      department_id,
    ],
  );

  return { rows: [department] };
};
const deactivateDepartmentInDB = async (department_id) => {
  const { rows: [department] } = await db.query(
    `UPDATE departments
     SET is_active = FALSE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING
       id,
       academy_id,
       code,
       name,
       faculty,
       total_years,
       description,
       is_active`,
    [department_id],
  );

  return { rows: [department] };
};


// Services
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
    department: toDepartmentDto(department),
  };
};
const listDepartmentsService = async (academy_id) => {
  if (!academy_id) {
    const err = new Error('academy_id is required');
    err.statusCode = 422;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  await ensureAcademyExists(academy_id);

  const { rows } = await listDepartmentsFromDB(academy_id);

  return {
    departments: rows.map(toDepartmentDto),
  };
};
const getDepartmentByIdService = async (department_id) => {
  const department = await ensureDepartmentExists(department_id);

  return {
    department: toDepartmentDto(department),
  };
};
const updateDepartmentService = async (payload) => {
  const { department_id } = payload;

  await ensureDepartmentExists(department_id);

  const { rows: [department] } = await updateDepartmentInDB(payload);

  return {
    department: toDepartmentDto(department),
  };
};
const deleteDepartmentService = async (department_id) => {
  await ensureDepartmentExists(department_id);

  const { rows: [department] } = await deactivateDepartmentInDB(department_id);

  return {
    department: toDepartmentDto(department),
  };
};


export {
  createDepartmentService,
  listDepartmentsService,
  getDepartmentByIdService,
  updateDepartmentService,
  deleteDepartmentService,
};

