import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { UserPayload } from '../types/APITypes';
import buildPath from '../components/Path';
import '../styles/Verify.css';
import { toast } from 'react-toastify';

function VerifyPage() {
    const [message, setMessage] = useState(''); // used to give user a response

    useEffect(() => {
        doEmailVerify();
    }, []);

    async function doEmailVerify(): Promise<void> {
        // Pull userId and JWT sent via email from query URL
        const urlQuery = new URLSearchParams(document.location.search);
        const packetObject = {
            userId: urlQuery.get("UserId"),
            jwtToken: urlQuery.get("Token")
        };
        const packetJSON = JSON.stringify(packetObject);

        if (packetObject.jwtToken === null || packetObject.userId === null) {
            setMessage('Missing UserId or Token');
            return;
        }

        // Check that decoded field matches
        try {
            const decodeToken = jwtDecode<UserPayload>(packetObject.jwtToken);
            const decodedUserId = decodeToken.userId;
            const userId = packetObject.userId;

            if (decodedUserId !== userId) {
                setMessage('UserId and associated token do not match');
                return;
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            toast.error(msg);
            return;
        }

        // Send packet to /email/emailVerification to validate JWT and update DB entry
        try {
            const response = await fetch(buildPath('api/email/emailVerification'), {
                method: 'POST',
                body: packetJSON,
                headers: { 'Content-Type': 'application/json' }
            });

            const result = JSON.parse(await response.text());

            if (result.error !== '') {
                setMessage('Verification failed: ' + result.error);
                return;
            }

            setMessage('Your email has been verified!');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            setMessage(msg);
        }
    }

    return (
        <div className="verify-container">
            <div id="verifyDiv">
                <span id="inner-title">Verifying your email...</span><br /><br />
                <span id="verifyResult">{message}</span>
            </div>
        </div>
    );
}

export default VerifyPage;