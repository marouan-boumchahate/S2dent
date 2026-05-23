import {
    createStudentService,
    updateStudentService,
    fetchAllStudentsService,
    fetchStudentService,
} from './student.service.js';
import { created, ok } from '../../utils/response.js';

const createStudentController = async (req, res) => {
    const payload = {
        user_id: req.body.user_id,
        academy_id: req.body.academy_id,
        department_id: req.body.department_id,
        advisor_id: req.body.advisor_id,
        current_level: req.body.current_level,
        enrollment_status: req.body.enrollment_status,
        enrollment_date: req.body.enrollment_date,
        actual_graduation_date: req.body.actual_graduation_date
    };

    const result = await createStudentService({ ...payload });

    return created(res, result, 'Student registered successfully');
};
const updateStudentController = async (req, res) => {
    const { id } = req.params;
    const payload = { cgpa: req.body.cgpa };

    const result = await updateStudentService( { ...payload, student_id: id });

    return created(res, result, 'Student updated successfully');
};

const getAllStudentsController = async (req, res) => {
    const { rid: academy_id } = req.user;
    const result = await fetchAllStudentsService(academy_id);

    return ok(res, result, 'All students retrieved successfully');
};

const getStudentByIdController = async (req, res) => {
    const { id } = req.params;
    const result = await fetchStudentService(id);

    return ok(res, result, 'Student retrieved successfully');
};

const getMyProfileController = async (req, res) => {
    const { rid } = req.user;
    const result = await fetchStudentService(rid);

    return ok(res, result, 'Student profile retrieved successfully');
};

export {
    createStudentController,
    updateStudentController,
    getAllStudentsController,
    getStudentByIdController,
    getMyProfileController,
};