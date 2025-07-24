const token = require('../../createJWT.js');
const { sendErrorResponse } = require('../utils/response');

// Helper function to validate JWT tokens
const validateJWT = (jwtToken) => {
    try {
        if(token.isExpired(jwtToken)) {
            return { valid: false, error: 'The JWT is no longer valid' };
        }
        return { valid: true };
    } catch(e) {
        console.log(e.message);
        return { valid: false, error: 'Invalid token' };
    }
};

// Middleware for JWT validation
const validateJWTMiddleware = (req, res, next) => {
    const { jwtToken } = req.body;
    if (!jwtToken) {
        return sendErrorResponse(res, 'JWT token is required', null, 400);
    }

    const validation = validateJWT(jwtToken);
    if (!validation.valid) {
        return sendErrorResponse(res, validation.error, jwtToken, 200);
    }

    next();
};

module.exports = {
    validateJWT,
    validateJWTMiddleware
}; 