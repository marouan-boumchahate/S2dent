import Joi from 'joi';

const PROFESSOR_TITLES = [
    'Asst. Prof.',
    'Assoc. Prof.',
    'Prof.',
    'Lect.',
    'Res.',
    'Other'
];

const createProfessorSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    full_name: Joi.string().trim().min(5).max(255).required(),
    phone: Joi.string().regex(/^\+\d{1,3}\d{10}$/)
        .messages({
            'string.pattern.base': `Phone number must have 10 digits.`
        }).optional(),
    department: Joi.string().trim().max(100).required(),
    faculty: Joi.string().trim().required(),
    title: Joi.string().valid(...PROFESSOR_TITLES).optional()
        .messages({
            'any.only': `type must be one of: ${PROFESSOR_TITLES.join(', ')}`,
        }),
    academy_id: Joi.string().uuid().required()
});

export { createProfessorSchema };