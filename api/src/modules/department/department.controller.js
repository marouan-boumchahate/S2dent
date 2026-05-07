import { created, noContent, ok } from '../../utils/response.js';
import {
  createDepartmentService,
  listDepartmentsService,
  getDepartmentByIdService,
  updateDepartmentService,
  deleteDepartmentService,
} from './department.service.js';

const createDepartmentController = async (req, res) => {
  const payload = {
    academy_id: req.body.academy_id,
    code: req.body.code,
    name: req.body.name,
    faculty: req.body.faculty,
    total_years: req.body.total_years,
    description: req.body.description,
    is_active: req.body.is_active,
  };

  const result = await createDepartmentService({ ...payload });

  return created(res, result, 'Department created successfully');
};

const listDepartmentsController = async (req, res) => {
  const result = await listDepartmentsService(req.query.academy_id);

  return ok(res, result, 'Departments retrieved successfully');
};

const getDepartmentByIdController = async (req, res) => {
  const { id } = req.params;

  const result = await getDepartmentByIdService(id);

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
  getDepartmentByIdController,
  updateDepartmentController,
  deleteDepartmentController,
};

