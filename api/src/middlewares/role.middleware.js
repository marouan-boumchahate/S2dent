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

export default requireRole;