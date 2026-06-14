import {
    createStudentService,
    updateStudentService,
    fetchAllStudentsService,
    fetchStudentService,
} from './student.service.js';
import { created, ok } from '../../utils/response.js';

const createStudentController = async (req, res) => {
    const { rid: academy_id } = req.user;

    const payload = {
        user: req.body.user,
        address: req.body.address,
        department_id: req.body.department_id,
        advisor_id: req.body.advisor_id,
        current_level: req.body.current_level,
        enrollment_status: req.body.enrollment_status,
        enrollment_date: req.body.enrollment_date,
        actual_graduation_date: req.body.actual_graduation_date
    };

    const result = await createStudentService({ ...payload, academy_id });

    return created(res, result, 'Student registered successfully');
};
const updateStudentController = async (req, res) => {
    const { id } = req.params;
    const payload = { cgpa: req.body.cgpa };

    const result = await updateStudentService( { ...payload, student_id: id });

    return created(res, result, 'Student updated successfully');
};

const getAllStudentsController = async (req, res) => {
    const { rid, role } = req.user;
    const result = await fetchAllStudentsService(rid, role);

    return ok(res, result, 'All students retrieved successfully');
};

const getStudentByIdController = async (req, res) => {
    const { rid, role } = req.user;
    const { id } = req.params;
    const result = await fetchStudentService({
        student_id: id,
        requester_id: rid,
        requester_role: role,
    });

    return ok(res, result, 'Student retrieved successfully');
};

const getMyProfileController = async (req, res) => {
    const { rid } = req.user;
    const result = await fetchStudentService({
        student_id: rid,
    });

    return ok(res, result, 'Student profile retrieved successfully');
};

export {
    createStudentController,
    updateStudentController,
    getAllStudentsController,
    getStudentByIdController,
    getMyProfileController,
};