import { Readable } from 'stream'
import cloudinary from '../config/cloudinary.js'

const uploadImage = (buffer, mimetype) =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                folder: 's2dent/uploads',
                format: mimetype === 'image/png' ? 'png' : 'jpg',
            },
            (error, result) => {
                if (error) return reject(error)
                return resolve(result.secure_url)
            },
        )

        uploadStream.on('error', reject)
        Readable.from([buffer]).pipe(uploadStream)
    })

export { uploadImage }