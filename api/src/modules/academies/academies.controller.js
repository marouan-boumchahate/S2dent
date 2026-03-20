import { createAcademyService } from './academies.service.js';
import { created } from '../../utils/response.js';

const createAcademy = async (req, res) => {
    const { 
        walletAddress,
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
        walletAddress,
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

export { createAcademy };