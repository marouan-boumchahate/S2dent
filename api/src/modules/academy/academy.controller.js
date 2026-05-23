import {
    createAcademyService,
    fetchAllAcademiesService,
    fetchAcademyByIdService,
    updateAcademyService,
} from './academy.service.js';
import { created, ok } from '../../utils/response.js';


const createAcademyController = async (req, res) => {
    const payload = {
        email: req.body.email,
        name: req.body.name,
        short_name: req.body.short_name,
        type: req.body.type,
        description: req.body.description,
        website: req.body.website,
        logo_url: req.body.logo_url,
        phone: req.body.phone,
        legal_name: req.body.legal_name,
        registration_number: req.body.registration_number,
        tax_id: req.body.tax_id,
        billing_email: req.body.billing_email,
    };

    const result = await createAcademyService({ ...payload });

    return created(res, result, 'Academy registered successfully');
};
const getAllAcademiesController = async (req, res) => {
    const result = await fetchAllAcademiesService();
    return ok(res, result, 'Academies retrieved successfully');
};
const getAcademyByIdController = async (req, res) => {
    const { id } = req.params;
    const result = await fetchAcademyByIdService(id);

    return ok(res, result, 'Academy retrieved successfully');
};
const updateAcademyController = async (req, res) => {
    const { id } = req.params;
    const payload = {
        description: req.body.description,
        logo_url: req.body.logo_url,
        phone: req.body.phone,
        website: req.body.website,
    };

    const result = await updateAcademyService({ ...payload, academy_id: id });

    return ok(res, result, 'Academy updated successfully');
};


export {
    createAcademyController,
    getAllAcademiesController,
    getAcademyByIdController,
    updateAcademyController,
};