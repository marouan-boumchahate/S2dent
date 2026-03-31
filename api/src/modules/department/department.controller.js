import { created } from '../../utils/response.js';
import { createDepartmentService } from './department.service.js';

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

export { createDepartmentController };

