import { createStudentService } from './student.service.js';
import { created } from '../../utils/response.js';

const createStudentController = async (req, res) => {
    const payload = {
        user_id: req.body.user_id,
        academy_id: req.body.academy_id,
        department_id: req.body.department_id,
        current_level: req.body.current_level,
        enrollment_status: req.body.enrollment_status,
        enrollment_date: req.body.enrollment_date,
        actual_graduation_date: req.body.actual_graduation_date
    };

    const result = await createStudentService({ ...payload });

    return created(res, result, 'Student registered successfully');
};

export { createStudentController };