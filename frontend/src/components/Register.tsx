import React, { useState } from 'react';
import { buildPath } from './Path';
import BadWordsChecker from './BadWordsChecker';
import { jwtDecode } from 'jwt-decode';


/*
This is a template for the frontend Register function:
it will take the entries in the elements labeled "registerName", "registerPassword", "registerFName", "registerLName", and "registerEmail"
and JSONify it into a packet to send to <IP>:5001/api/register
it will handle errors sent back through API response packet and anything caught in the try block
It interprets the lack of a user error as a success

The set variables are used to hold a user's input, similar to Login. This does not apply to passwords for courtesy reasons
*/

/*
frontend sends following packet to /api/register:
{
    "login": <login string>,
    "password": <password string>,
    "firstName": <firstname string>,
    "lastName": <lastname string>,
    "email": <email string>
}
*/

interface UserPayload {
    userId: number;
    firstName: string;
    lastName: string;
    iat: number;
}

function Register() {
    const [message, setMessage] = useState('');
    const [registerName, setRegisterUsername] = React.useState('');
    const [registerPassword, setRegisterPassword] = React.useState('');
    const [registerFName, setRegisterFName] = React.useState('');
    const [registerLName, setRegisterLName] = React.useState('');
    const [registerEmail, setRegisterEmail] = React.useState('');

    async function doRegister(event:any) : Promise<void> {
        event.preventDefault();

        setRegisterPassword('');
        setRegisterEmail('');
        setMessage('');

        //long series of checks to prevent strange usernames.........yes I know, I'm a fun killer
        if(registerName.length < 2) {
            setMessage('Username must consist of 2 or more characters');
            return;
        }

        if(registerPassword.length < 5) {
            setMessage('Password must consist of 5 or more characters');
            return;
        }

        if(registerFName.length < 2) {
            setMessage('Firstname must consist of 2 or more letters');
            return;
        }

        if(!(registerEmail.includes('@') || registerEmail.includes('.'))) {
            setMessage('Invalid email format');
            return;
        }
        
        //checks if username, firstname, lastname have any bad words.
        //password and email are not checked because the former is private
        //and the latter requires email verification so they have to type in a valid email anyways
        if(BadWordsChecker(registerName) || BadWordsChecker(registerFName) || BadWordsChecker(registerLName)) {
            setMessage("It's okay to spread positivity too, you know?");
            return;
        }

        let sentPacket = { login:registerName, password:registerPassword, firstName:registerFName, lastName:registerLName, email:registerEmail };
        let packetJSON = JSON.stringify(sentPacket);

        //complete regular registration operations
        try {
            const responsePacket = await fetch(buildPath('api/register'), {method:'POST', body:packetJSON, headers:{'Content-Type':'application/json'}});

            let parsedPacket = JSON.parse(await responsePacket.text());
            //a successful response should not have an error field
            if(!(parsedPacket.error === undefined)) {
                setMessage(parsedPacket.error);
                return;
            }

            const { accessToken } = parsedPacket;

            const decoded = jwtDecode<UserPayload>(accessToken);

            //send JWT's userId field to email-send in api
            try {
                let emailToken = decoded;
                let userId = emailToken.userId;
                let emailPacket = JSON.stringify({login:registerName, email:registerEmail, userId:userId, jwtToken:accessToken});

                const emailSend = await fetch(buildPath('api/email-send'), {method:'POST', body:emailPacket, headers:{'Content-Type':'application/json'}});
                let emailResponse = JSON.parse(await emailSend.text());
                if(!(emailResponse.error == '')) {
                    setMessage(emailResponse.error);
                    return;
                }
            } catch (emailError:any) {
                alert(emailError.toString());
            }

            setMessage('Account creation successful! Please check your email to verify your account. Happy Questing!');
        } catch(registerError:any) {
            alert(registerError.toString());
            return;
        }
    };

    function handleSetRegisterUsername(event:any) : void {
        setRegisterUsername(event.target.value);
    }

    function handleSetRegisterFName(event:any) : void {
        setRegisterFName(event.target.value);
    }

    function handleSetRegisterLName(event:any) : void {
        setRegisterLName(event.target.value);
    }

    function handleSetRegisterEmail(event:any) : void {
        setRegisterEmail(event.target.value);
    }

    function handleSetRegisterPassword(event:any) : void {
        setRegisterPassword(event.target.value);
    }

    return (
        <div id="registerDiv">
            <span id="inner-title">Create a New Account</span><br />
            <input type="text" id="registerName" placeholder="Username" onChange={handleSetRegisterUsername}/><br />
            <input type="text" id="registerFName" placeholder="First Name" onChange={handleSetRegisterFName}/><br />
            <input type="text" id="registerLName" placeholder="Last Name (optional)" onChange={handleSetRegisterLName}/><br />
            <input type="text" id="registerEmail" placeholder="Email" onChange={handleSetRegisterEmail}/><br />
            <input type="password" value={registerPassword} id="registerPassword" placeholder="Password" onChange={handleSetRegisterPassword}/><br />
            <input type="submit" id="registerButton" className="buttons" value="Register" onClick={doRegister} /><br />
            <span id="registerResult">{message}</span>
        </div>
    );
};

export default Register;