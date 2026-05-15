import { createAcademyService } from './academy.service.js';
import { created } from '../../utils/response.js';

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

export { createAcademyController };