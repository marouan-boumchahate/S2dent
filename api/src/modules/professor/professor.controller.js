import { created, ok } from '../../utils/response.js';
import { 
    createProfessorService, 
    updateProfessorService, 
    fetchProfessorService,
    fetchAllProfessorsService,
    fetchAllProfessorsNamesService
} from './professor.service.js';

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
const updateProfessorController = async (req, res) => {
    const { rid } = req.user;
    const { bio } = req.body;

    const result = await updateProfessorService({
        professor_id: rid,
        bio
    });
    
    return ok(res, result, 'Professor updated successfully');
};
const updateProfessorByAdminController = async (req, res) => {
    const { id } = req.params;
    const { rank, employment_type, office_location, office_hours } = req.body;

    const result = await updateProfessorService({
        professor_id: id,
        rank,
        employment_type,
        office_location,
        office_hours
    });
    
    return ok(res, result, 'Professor updated successfully');
};
const getAllProfessorsController = async (req, res) => {
    const { rid: academy_id } = req.user;

    const result = await fetchAllProfessorsService(academy_id);
    return ok(res, result, 'All professors retrieved successfully');
};
const getAllProfessorsNamesController = async (req, res) => {
    const { rid: academy_id } = req.user;

    const result = await fetchAllProfessorsNamesService(academy_id);
    return ok(res, result, 'All professors names retrieved successfully');
};
const getProfessorByIdController = async (req, res) => {
    const { id } = req.params;
    const result = await fetchProfessorService(id);

    return ok(res, result, 'Professor retrieved successfully');
};
const getMyProfileController = async (req, res) => {
    const { rid } = req.user;
    const result = await fetchProfessorService(rid);

    return ok(res, result, 'Professor profile retrieved successfully');
};

export { 
    createProfessorController, 
    updateProfessorController, 
    updateProfessorByAdminController, 
    getAllProfessorsController,
    getAllProfessorsNamesController,
    getProfessorByIdController, 
    getMyProfileController 
};