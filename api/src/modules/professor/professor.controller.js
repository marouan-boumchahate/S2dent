import { createProfessorService } from './professor.service.js';
import { created } from '../../utils/response.js';

const createProfessorController = async (req, res) => {
    const { 
        email, 
        full_name, 
        title, 
        department, 
        faculty, 
        phone,
        academy_id
    } = req.body;

    const result = await createProfessorService({
        email, 
        full_name, 
        title, 
        department, 
        faculty, 
        phone,
        academy_id
    });

    return created(res, result, 'Professor registered successfully');
};

export { createProfessorController };