const token = require('../../createJWT.js');

// Helper functions for consistent response formatting
const refreshToken = (jwtToken) => {
    try {
        return token.refresh(jwtToken);
    } catch(e) {
        console.log(e.message);
        return null;
    }
};

const sendResponse = (res, data, status = 200) => {
    res.status(status).json(data);
};

const sendErrorResponse = (res, error, jwtToken = null, status = 200) => {
    const refreshedToken = refreshToken(jwtToken);
    sendResponse(res, { error: error, jwtToken: refreshedToken }, status);
};

const sendSuccessResponse = (res, data, jwtToken = null, status = 200) => {
    const refreshedToken = refreshToken(jwtToken);
    sendResponse(res, { ...data, jwtToken: refreshedToken }, status);
};

module.exports = {
    sendResponse,
    sendErrorResponse,
    sendSuccessResponse
}; 