import { Router } from 'express'
import { uploadSingleImage } from '../../middlewares/upload.middleware.js'
import { validateMediaUpload } from './media.validator.js'
import { uploadMediaController } from './media.controller.js'
import authenticate from '../../middlewares/auth.middleware.js'
import requireRole from '../../middlewares/role.middleware.js'

const router = Router()

router.post(
    '/upload', 
    authenticate,
    requireRole('admin', 'professor', 'student', 'academy'),
    uploadSingleImage, 
    validateMediaUpload, 
    uploadMediaController
)

export default router