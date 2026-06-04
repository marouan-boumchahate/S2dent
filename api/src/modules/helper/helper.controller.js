import { signingDataService } from './helper.service.js';
import { ok } from '../../utils/response.js';

const signingDataController = async (req, res) => {
  const { payload, privateKey } = req.body;

  const result = await signingDataService(payload, privateKey);

  return ok(res, result, 'Data signed successfully');
}
const signingDataStringController = async (req, res) => {
  const { value, privateKey } = req.body;

  const result = await signingDataService(value, privateKey);

  return ok(res, result, 'Data signed successfully');
}

export { signingDataController, signingDataStringController };
