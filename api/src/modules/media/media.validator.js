import Joi from 'joi'

const allowedImageMimeTypes = ['image/jpeg', 'image/png']
const maxImageSizeBytes = 5 * 1024 * 1024

const mediaUploadSchema = Joi.object({
    mimetype: Joi.string()
        .valid(...allowedImageMimeTypes)
        .required()
        .messages({
            'any.only': 'Only jpg and png images are allowed',
            'any.required': 'Image file is required',
            'string.base': 'Invalid image file type',
        }),
    size: Joi.number()
        .max(maxImageSizeBytes)
        .required()
        .messages({
            'number.max': 'Image size must be 5MB or less',
            'any.required': 'Image file is required',
            'number.base': 'Invalid image file size',
        }),
})

const validateMediaUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(422).json({
            success: false,
            code: 'VALIDATION_ERROR',
            errors: [{ field: 'image', message: 'Image file is required' }],
        })
    }

    const { error } = mediaUploadSchema.validate(req.file, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    })

    if (error) {
        const errors = error.details.map((detail) => ({
            field: detail.path.join('.') || 'image',
            message: detail.message,
        }))

        return res.status(422).json({
            success: false,
            code: 'VALIDATION_ERROR',
            errors,
        })
    }

    return next()
}

export { allowedImageMimeTypes, maxImageSizeBytes, mediaUploadSchema, validateMediaUpload }