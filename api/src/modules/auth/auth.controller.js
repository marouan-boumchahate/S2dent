import { generateNonceService, verifySignatureService, refreshTokenService } from './auth.service.js';
import { created, ok } from '../../utils/response.js';

const generateNonceController = async (req, res) => {
  const { address } = req.query;

  const result = await generateNonceService(address);

  return ok(res, result, 'Nonce expires in 5 minutes');
}
const verifySignatureController = async (req, res) => { 
  const { address, signature } = req.body;

  const result = await verifySignatureService(address, signature);

  return created(res, result, 'User authenticated successfully');
}
const refreshTokenController = async (req, res) => {
  const { refreshToken } = req.body;

  const result = await refreshTokenService(refreshToken);

  return created(res, result, 'Token refreshed successfully');
}

export { generateNonceController, verifySignatureController, refreshTokenController };
