import { Signature } from 'ethers';
import Joi from 'joi';


const semesters = [
    'fall',
    'spring',
    'summer'
];
const degreeLevels = [
    'bachelor',
    'master',
    'phd'
];
const honors = [
    'with_honors',
    'great_honors',
    'highest_honors'
];
const certificateCategories = [
    'professional',
    'academic',
    'language',
    'technical',
    'compliance',
    'safety'
];
const deliveryModes = [
    'online',
    'in_person',
    'hybrid'
];
const achievementTypes = [
    'award',
    'honor',
    'competition',
    'publication',
    'patent',
    'scholarship',
    'recognition',
    'extracurricular'
];
const eventTypes = [
    'hackathon',
    'conference',
    'olympiad',
    'contest',
    'exhibition',
    'ceremony'
];
const credentialTypes = [
    'enrollment',
    'attendance',
    'degree',
    'certificate',
    'achievement',
    'transcript'
];

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/


const payloadSchemas = {
    enrollment: Joi.object({
        course_name: Joi.string().required(),
        course_code: Joi.string().required(),
        academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
        semester: Joi.string().valid(...semesters).required(),
        enrollment_date: Joi.date().iso().required()
    }),
    attendance: Joi.object({
        course_code: Joi.string().required(),
        course_name: Joi.string().required(),
        academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
        semester: Joi.string().valid(...semesters).required(),
        total_sessions: Joi.number().integer().min(1).required(),
        attended_sessions: Joi.number().integer().min(0).required(),
        excused_absences: Joi.number().integer().min(0).required(),
        period_from: Joi.date().iso().required(),
        period_to: Joi.date().iso().required()
    }),
    degree: Joi.object({
        degree_title: Joi.string().required(),
        degree_level: Joi.string().valid(...degreeLevels).required(),
        major: Joi.string().required(),
        program_code: Joi.string().required(),
        faculty: Joi.string().required(),
        department: Joi.string().required(),
        graduation_date: Joi.date().iso().required(),
        gpa: Joi.number().min(0).required(),
        gpa_scale: Joi.number().valid(4.0, 5.0, 100).required(),
        class_rank: Joi.number().integer().min(1),
        class_size: Joi.number().integer().min(1),
        honors: Joi.string().valid(...honors).required(),
        total_credits_earned: Joi.number().integer().required(),
        required_credits: Joi.number().integer().required(),
    }),
    certificate: Joi.object({
        certificate_name: Joi.string().required(),
        certificate_code: Joi.string().required(),
        certificate_category: Joi.string().valid(...certificateCategories).required(),
        program_duration_hours: Joi.number().integer().min(1),
        delivery_mode: Joi.string().valid(...deliveryModes).required(),
        start_date: Joi.date().iso().required(),
        end_date: Joi.date().iso().required(),
        final_score: Joi.number().min(0).max(100),
        passing_score: Joi.number().min(0).max(100),
        instructor_name: Joi.string().required(),
    }),
    achievement: Joi.object({
        achievement_title: Joi.string().required(),
        achievement_type: Joi.string().valid(...achievementTypes).required(),
        event_name: Joi.string().required(),
        event_type: Joi.string().valid(...eventTypes).required(),
        event_organizer: Joi.string().required(),
        event_date: Joi.date().iso().required(),
        event_location: Joi.string(),
        score: Joi.number().allow(null),
        placement: Joi.string(),
        team_name: Joi.string().allow('', null),
        project_title: Joi.string(),
        project_description: Joi.string(),
    }),
    transcript: Joi.object({
        academic_year_from: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
        academic_year_to: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
        program_name: Joi.string().required(),
        degree_level: Joi.string().valid(...degreeLevels).required(),
        cumulative_gpa: Joi.number().min(0).required(),
        gpa_scale: Joi.number().valid(4.0, 5.0, 100).required(),
        total_credits_attempted: Joi.number().integer().required(),
        total_credits_earned: Joi.number().integer().required()
    }),
};


const createCredentialSchema = Joi.object({
    title: Joi.string().max(255).required(),
    credential_type: Joi.string().valid(...credentialTypes).required(),
    description: Joi.string().optional(),
    student_address: Joi.string().pattern(ETH_ADDRESS).required()
        .messages({
          'string.pattern.base': 'student_wallet must be a valid Ethereum address (0x…)',
        }),
    payload: Joi.when('credential_type', {
        switch: Object.entries(payloadSchemas).map(([type, schema]) => ({
            is: type,
            then: schema.required(),
        })),
        otherwise: Joi.forbidden(),
    }),
});
const issueCredentialSchema = Joi.object({
    signature: Joi.string().pattern(SIGNATURE).required()
        .messages({
          'string.pattern.base': 'Signature must be a valid Ethereum signature (0x…)',
        }),
});
const revokeCredentialSchema = Joi.object({
    reason: Joi.string().max(500).required()
});
const verifyCredentialTokenSchema = Joi.object({
    student_address: Joi.string().pattern(ETH_ADDRESS).required()
        .messages({
          'string.pattern.base': 'student_address must be a valid Ethereum address (0x…)',
        }),
    student_signature: Joi.string().pattern(SIGNATURE).required()
        .messages({
          'string.pattern.base': 'student_signature must be a valid Ethereum signature (0x…)',
        }),
});


export {
    createCredentialSchema,
    issueCredentialSchema,
    revokeCredentialSchema,
    verifyCredentialTokenSchema
}