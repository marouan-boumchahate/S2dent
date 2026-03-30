import { createStudentService } from './student.service.js';
import { created } from '../../utils/response.js';

const createStudentController = async (req, res) => {
    const {
        academy_id,
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        gender,
        national_id,
        email,
        phone,
        address,
        city,
        country,
        department,
        faculty,
        actual_study_duration_in_years,
        current_level,
        actual_graduation_date,
        photo_url,
        notes
    } = req.body;

    const result = await createStudentService({
        academy_id,
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        gender,
        national_id,
        email,
        phone,
        address,
        city,
        country,
        department,
        faculty,
        actual_study_duration_in_years,
        current_level,
        actual_graduation_date,
        photo_url,
        notes
    });

    return created(res, result, 'Student registered successfully');
};

export { createStudentController };