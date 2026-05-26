import multer from 'multer'
import { allowedImageMimeTypes, maxImageSizeBytes } from '../modules/media/media.validator.js'


const storage = multer.memoryStorage()


const createUploadError = (message, statusCode = 422, code = 'VALIDATION_ERROR') => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}
const upload = multer({
  storage,
  limits: {
    fileSize: maxImageSizeBytes,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageMimeTypes.includes(file.mimetype)) {
      return cb(createUploadError('Only jpg and png images are allowed'))
    }

    return cb(null, true)
  },
})
const uploadSingleImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next()

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(createUploadError('Image size must be 5MB or less'))
    }

    return next(err)
  })
}


export { upload, uploadSingleImage, createUploadError }