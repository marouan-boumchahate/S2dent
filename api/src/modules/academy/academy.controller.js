import { createAcademyService } from './academy.service.js';
import { created } from '../../utils/response.js';

const createAcademyController = async (req, res) => {
    const { 
        wallet_address,
        email, 
        name, 
        short_name, 
        type, 
        country, 
        city, 
        address, 
        website 
    } = req.body;

    const result = await createAcademyService({
        wallet_address,
        email,
        name,
        short_name,
        type,
        country,
        city,
        address,
        website
    });

    return created(res, result, 'Academy registered successfully');
};

export { createAcademyController };