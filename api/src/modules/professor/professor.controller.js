import { createProfessorService } from './professor.service.js';
import { created } from '../../utils/response.js';

const createProfessorController = async (req, res) => {
    const payload = {
        user_id: req.body.user_id,
        academy_id: req.body.academy_id,
        department_id: req.body.department_id,
        title: req.body.title,
        rank: req.body.rank,
        specialization: req.body.specialization,
        hire_date: req.body.hire_date,
        employment_type: req.body.employment_type,
        office_location: req.body.office_location,
        office_hours: req.body.office_hours,
        bio: req.body.bio
    };

    const result = await createProfessorService({ ...payload });

    return created(res, result, 'Professor registered successfully');
};

export { createProfessorController };