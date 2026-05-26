import { ok } from '../../utils/response.js'
import { uploadImage } from '../../utils/cloudinary.js'

const uploadMediaController = async (req, res) => {
  const { buffer, mimetype } = req.file
  const url = await uploadImage(buffer, mimetype)

  return ok(res, { url }, 'Image uploaded successfully')
}

export { uploadMediaController }