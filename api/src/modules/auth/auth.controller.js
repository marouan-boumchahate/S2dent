import { generateNonceService, verifySignatureService, refreshTokenService, logoutService } from './auth.service.js';
import { created, ok } from '../../utils/response.js';

const generateNonceController = async (req, res) => {
  const { address } = req.query;

  const result = await generateNonceService(address);

  return ok(res, result, 'Nonce expires in 5 minutes');
}
const verifySignatureController = async (req, res) => { 
  const { address, signature } = req.body;
  const { ip, headers } = req;

  const result = await verifySignatureService(address, signature, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return created(res, result, 'User authenticated successfully');
}
const refreshTokenController = async (req, res) => {
  const { refreshToken } = req.body;
  const { ip, headers } = req;

  const result = await refreshTokenService(refreshToken, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return created(res, result, 'Token refreshed successfully');
}
const logoutController = async (req, res) => {
  const { refreshToken } = req.body;
  const { ip, headers } = req;

  await logoutService(refreshToken, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return ok(res, null, 'Logged out successfully');
}

export { generateNonceController, verifySignatureController, refreshTokenController, logoutController };
