import { 
  generateAdminNonceService,
  generateNonceService, 
  verifyAdminSignatureService,
  verifySignatureService, 
  refreshTokenService, 
  logoutService,
  sendOtpService
} from './auth.service.js';
import { created, ok } from '../../utils/response.js';


const generateAdminNonceController = async (req, res) => {
  const result = await generateAdminNonceService();
  return ok(res, result, 'Nonce expires in 5 minutes');
}
const generateNonceController = async (req, res) => {
  const { wallet_address } = req.query;

  const result = await generateNonceService(wallet_address);

  return ok(res, result, 'Nonce expires in 5 minutes');
}
const verifyAdminSignatureController = async (req, res) => {
  const { signature } = req.body;
  const { ip, headers } = req;

  const result = await verifyAdminSignatureService(signature, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return ok(res, result, 'Admin authenticated successfully');
}
const verifySignatureController = async (req, res) => { 
  const { wallet_address, signature } = req.body;
  const { ip, headers } = req;

  const result = await verifySignatureService(wallet_address, signature, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return created(res, result, 'User authenticated successfully');
}
const refreshTokenController = async (req, res) => {
  const { refresh_token } = req.body;
  const { ip, headers } = req;

  const result = await refreshTokenService(refresh_token, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return created(res, result, 'Token refreshed successfully');
}
const logoutController = async (req, res) => {
  const { refresh_token } = req.body;
  const { ip, headers } = req;

  await logoutService(refresh_token, {
    ip: ip || headers['x-forwarded-for'],
    device: headers['user-agent'],
  });

  return ok(res, null, 'Logged out successfully');
}
const sendOtpController = async (req, res) => {
  const { email } = req.body;

  const result = await sendOtpService(email);

  return created(res, result, 'check your email for the OTP code');
}


export { 
  generateAdminNonceController,
  generateNonceController, 
  verifyAdminSignatureController,
  verifySignatureController, 
  refreshTokenController, 
  logoutController, 
  sendOtpController
};
