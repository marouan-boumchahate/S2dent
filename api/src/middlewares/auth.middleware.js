import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';

function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

        const token = header.split(' ')[1];

        req.user = verifyAccessToken(token);
        next();

    } catch (err) {
        const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        
        const err = new Error(msg);
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            const err = new Error('Forbidden');
            err.statusCode = 403;
            err.code = 'FORBIDDEN';
            throw err;
        }
        next();
    };
}

module.exports = { authenticate, requireRole };