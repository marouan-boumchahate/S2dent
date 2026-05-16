import { created, noContent, ok } from '../../utils/response.js';
import {
  createDepartmentService,
  listDepartmentsService,
  getUserDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
} from './department.service.js';


const createDepartmentController = async (req, res) => {
  const payload = {
    code: req.body.code,
    name: req.body.name,
    faculty: req.body.faculty,
    total_years: req.body.total_years,
    description: req.body.description,
    is_active: req.body.is_active,
  };

  const academy_id = req.user.rid;

  const result = await createDepartmentService({ ...payload, academy_id });

  return created(res, result, 'Department created successfully');
};
const listDepartmentsController = async (req, res) => {
  const { rid } = req.user;

  const result = await listDepartmentsService(rid);

  return ok(res, result, 'Departments retrieved successfully');
};
const getUserDepartmentController = async (req, res) => {
  const { uid: user_id, role } = req.user;

  const result = await getUserDepartmentService(user_id, role);

  return ok(res, result, 'Department retrieved successfully');
};
const updateDepartmentController = async (req, res) => {
  const { id } = req.params;

  const payload = {
    department_id: id,
    description: req.body.description,
  };

  const result = await updateDepartmentService(payload);

  return ok(res, result, 'Department updated successfully');
};
const deleteDepartmentController = async (req, res) => {
  const { id } = req.params;

  const result = await deleteDepartmentService(id);

  return ok(res, result, 'Department deactivated successfully');
};


export {
  createDepartmentController,
  listDepartmentsController,
  getUserDepartmentController,
  updateDepartmentController,
  deleteDepartmentController,
};

