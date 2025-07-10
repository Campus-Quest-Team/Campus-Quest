const express = require('express');
const { Resend } = require('resend');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const User = require('../../models/users');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/emailSend', async (req, res, next) => {
    //incoming: login, email, userId, jwtToken
    //outgoing: data { id }, error, jwtToken { accessToken }
    //the data field is email information provided by Resend API

    const { login, email, userId, jwtToken } = req.body; //email goes into to: object, login is for personalization

    //generate unique verification link using userId and jwtToken
    //for dev just replace with localhost
    const verificationLink = `http://supercoolfun.site/verify?UserId=${userId}&Token=${jwtToken}`;

    //set up email body
    //this is very simple and uses vanilla html
    //we can use React email to format the HTML better, but that also requires like 5 modules
    //because React doesn't play well with vanilla html/js. ever.
    const emailBody = `
        <h1>Welcome to Campus Quest, ${login}!</h1>
        <p>You're almost ready to begin your journey! Please verify your email by clicking the button below:</p>
        <button><a href=${verificationLink}><strong>Verify My Account</strong></a></button
    `

    try {
        //leave this block alone and just edit the emailBody above
        //idempotencyKey is for security
        //the contents can't be tampered with on resends after sending an email with the same key
        const emailData = await resend.emails.send(
            {
                from: 'Campus Quest Team <no-reply@supercoolfun.site>',
                to: email,
                subject: 'Verify your Campus Quest account',
                html: emailBody,
            },
            {
                idempotencyKey: jwtToken,
            },
        );

        sendSuccessResponse(res, emailData, jwtToken, 200);
    } catch (error) {
        sendErrorResponse(res, error.toString());
        console.log(error);
    }
});

router.post('/emailVerification', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: error, jwtToken
    // the middleware automatically checks expiry, code below just ensures the emailVerified value is updated

    const { userId, jwtToken } = req.body;

    if(!userId) {
        return sendErrorResponse(res, 'Missing userId');
    }

    //find associated user in the database and set emailVerified to true
    try {
        const result = await User.findByIdAndUpdate(userId, { $set: { emailVerified: true } });

        if(!result) {
            return sendErrorResponse(res, 'User does not exist');
        }

        sendSuccessResponse(res, {error:''}, jwtToken, 200);

    } catch(e) {
        sendErrorResponse(res, e.message);
    }
});

module.exports = router; 