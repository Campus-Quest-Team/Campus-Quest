import { useState, useEffect } from 'react';
import { buildPath } from './Path';
import { jwtDecode } from 'jwt-decode';

interface UserPayload {
    //userId is used as string for comparison with decoded token
    userId: string;
    firstName: string;
    lastName: string;
    iat: number;
}

function EmailVerify() {
    const [message, setMessage] = useState(''); //used to give user a response

    useEffect(() => {
        doEmailVerify();
    }, []);

    async function doEmailVerify() : Promise<void> {
        //pull userId and JWT sent via email from query URL
        let urlQuery = new URLSearchParams(document.location.search);
        let packetObject = { userId:urlQuery.get("UserId"), jwtToken:urlQuery.get("Token") };
        let packetJSON = JSON.stringify(packetObject);

        if(packetObject.jwtToken === null || packetObject.userId === null) {
            setMessage('Missing UserId or Token');
            return;
        }

        //check that decoded field matches
        const decodeToken = jwtDecode<UserPayload>(packetObject.jwtToken);

        try {
            let decodedUserId = decodeToken.userId;
            let userId = packetObject.userId;

            if(!(decodedUserId == userId)) {
                setMessage('UserId and associated token do not match');
                return;
            }
        } catch (error:any) {
            alert(error.toString());
        }

        //send packet to /email-verification to validate JWT and update db entry
        try {
            const response = await fetch(buildPath('api/email-verification'), {method:'POST', body:packetJSON, headers:{'Content-Type':'application/json'}});

            let result = JSON.parse(await response.text());
            if(!(result.error == '')) { //empty error = success
                setMessage('Verification failed: ' + result.error);
                return;
            }

            setMessage('Your email has been verified!');
        } catch (error:any) {
            setMessage(error.toString());
        }
    };

    return (
        <div id="verifyDiv">
            <span id="inner-title">Verifying your email...</span><br /><br />
            <span id="verifyResult">{message}</span>
        </div>
    )
}

export default EmailVerify;