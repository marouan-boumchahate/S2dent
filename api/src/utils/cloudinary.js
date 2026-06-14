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
                return resolve({ url: result.secure_url, publicId: result.public_id })
            },
        )

        uploadStream.on('error', reject)
        Readable.from([buffer]).pipe(uploadStream)
    })

const deleteImage = (publicId) =>
    new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) return reject(error)
            return resolve(result)
        })
    })

const deleteImages = (publicIds) =>
    new Promise((resolve, reject) => {
        cloudinary.api.delete_resources(publicIds, (error, result) => {
            if (error) return reject(error)
            return resolve(result)
        })
    })

export { uploadImage, deleteImage, deleteImages }