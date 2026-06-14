import { ok } from '../../utils/response.js'
import { uploadMediaService } from './media.service.js'

const uploadMediaController = async (req, res) => {
  const { buffer, mimetype } = req.file
  const result = await uploadMediaService(buffer, mimetype)

  return ok(res, result, 'Image uploaded successfully')
}

export { uploadMediaController }