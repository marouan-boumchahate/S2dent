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


const validateAcademicYear = (value, helpers) => {
    const parts = value.split('-');
    const year1 = parseInt(parts[0], 10);
    const year2 = parseInt(parts[1], 10);
    if (year2 !== year1 + 1) {
        return helpers.message('Academic year must represent consecutive years (e.g. 2023-2024)');
    }
    return value;
};

const payloadSchemas = {
    enrollment: Joi.object({
        course_name: Joi.string().required(),
        course_code: Joi.string().required(),
        semester: Joi.string().valid(...semesters).required(),
        enrollment_date: Joi.date().iso().max('now').required()
    }),
    attendance: Joi.object({
        course_code: Joi.string().required(),
        course_name: Joi.string().required(),
        academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).custom(validateAcademicYear).required(),
        semester: Joi.string().valid(...semesters).required(),
        total_sessions: Joi.number().integer().min(1).required(),
        attended_sessions: Joi.number().integer().min(0).max(Joi.ref('total_sessions')).required(),
        excused_absences: Joi.number().integer().min(0).max(Joi.ref('total_sessions')).required(),
        period_from: Joi.date().iso().required(),
        period_to: Joi.date().iso().min(Joi.ref('period_from')).required()
    }).custom((value, helpers) => {
        if (value.attended_sessions + value.excused_absences > value.total_sessions) {
            return helpers.message('The sum of attended_sessions and excused_absences cannot exceed total_sessions');
        }
        return value;
    }),
    degree: Joi.object({
        degree_title: Joi.string().required(),
        degree_level: Joi.string().valid(...degreeLevels).required(),
        major: Joi.string().required(),
        program_code: Joi.string().required(),
        faculty: Joi.string().required(),
        department: Joi.string().required(),
        graduation_date: Joi.date().iso().max('now').required(),
        gpa: Joi.number().min(0).max(Joi.ref('gpa_scale')).required(),
        gpa_scale: Joi.number().valid(4.0, 5.0, 100).required(),
        class_rank: Joi.number().integer().min(1).max(Joi.ref('class_size')),
        class_size: Joi.number().integer().min(1),
        honors: Joi.string().valid(...honors).required(),
        total_credits_earned: Joi.number().integer().min(0).min(Joi.ref('required_credits')).required(),
        required_credits: Joi.number().integer().min(0).required(),
    }).with('class_rank', 'class_size'),
    certificate: Joi.object({
        certificate_name: Joi.string().required(),
        certificate_code: Joi.string().required(),
        certificate_category: Joi.string().valid(...certificateCategories).required(),
        program_duration_hours: Joi.number().integer().min(1),
        delivery_mode: Joi.string().valid(...deliveryModes).required(),
        start_date: Joi.date().iso().required(),
        end_date: Joi.date().iso().min(Joi.ref('start_date')).max('now').required(),
        final_score: Joi.number().min(0).max(100).min(Joi.ref('passing_score')),
        passing_score: Joi.number().min(0).max(100),
        instructor_name: Joi.string().required(),
    }),
    achievement: Joi.object({
        achievement_title: Joi.string().required(),
        achievement_type: Joi.string().valid(...achievementTypes).required(),
        event_name: Joi.string().required(),
        event_type: Joi.string().valid(...eventTypes).required(),
        event_organizer: Joi.string().required(),
        event_date: Joi.date().iso().max('now').required(),
        event_location: Joi.string(),
        score: Joi.number().min(0).allow(null),
        placement: Joi.string(),
        team_name: Joi.string().allow('', null),
        project_title: Joi.string(),
        project_description: Joi.string(),
    }),
    transcript: Joi.object({
        academic_year_from: Joi.string().pattern(/^\d{4}-\d{4}$/).custom(validateAcademicYear).required(),
        academic_year_to: Joi.string().pattern(/^\d{4}-\d{4}$/).custom(validateAcademicYear).required(),
        program_name: Joi.string().required(),
        degree_level: Joi.string().valid(...degreeLevels).required(),
        cumulative_gpa: Joi.number().min(0).max(Joi.ref('gpa_scale')).required(),
        gpa_scale: Joi.number().valid(4.0, 5.0, 100).required(),
        total_credits_attempted: Joi.number().integer().min(0).required(),
        total_credits_earned: Joi.number().integer().min(0).max(Joi.ref('total_credits_attempted')).required()
    }).custom((value, helpers) => {
        const fromYear = parseInt(value.academic_year_from.split('-')[0], 10);
        const toYear = parseInt(value.academic_year_to.split('-')[0], 10);
        if (fromYear > toYear) {
            return helpers.message('academic_year_from must not be after academic_year_to');
        }
        return value;
    }),
};


const createCredentialSchema = Joi.object({
    title: Joi.string().max(255).required(),
    credential_type: Joi.string().valid(...credentialTypes).required(),
    description: Joi.string().optional().allow(null, ''),
    student_address: Joi.string().pattern(ETH_ADDRESS).required()
        .messages({
          'string.pattern.base': 'student_address must be a valid Ethereum address (0x…)',
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
    expiration_time_in_seconds: Joi.number().integer().min(300).max(259200).optional().allow(null, '') // 5 min to 3 days
});


export {
    createCredentialSchema,
    issueCredentialSchema,
    revokeCredentialSchema,
    verifyCredentialTokenSchema
}