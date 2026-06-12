import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';

function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

        const token = header.split(' ')[1];

        req.user = verifyAccessToken(token);
        next();

    } catch (error) {
        const msg = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';

        const authError = new Error(msg);
        authError.statusCode = 401;
        authError.code = 'UNAUTHORIZED';
        
        return next(authError);
    }
}

export default authenticate;