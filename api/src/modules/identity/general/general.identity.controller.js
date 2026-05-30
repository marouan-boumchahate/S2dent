import { 
  fetchWaitingIdentitiesService
} from './general.identity.service.js'
import { ok } from '../../../utils/response.js'


const getWaitingIdentitiesController = async (req, res) => {
  const { rid: academy_id } = req.user
  const result = await fetchWaitingIdentitiesService(academy_id)

  return ok(res, result, 'Waiting identities retrieved successfully')
}


export { getWaitingIdentitiesController }