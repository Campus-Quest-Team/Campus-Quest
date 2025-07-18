import React, { useState } from 'react';
import '../styles/Login.css';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import buildPath from '../components/Path';


interface UserPayload {
    userId: number;
    firstName: string;
    lastName: string;
    iat: number;
}

function LoginPage()
{
    const [message, setMessage] = useState('');
    const [loginName, setLoginName] = React.useState('');
    const [loginPassword, setPassword] = React.useState('');
    const navigation = useNavigate();

    async function doLogin(event: React.FormEvent<HTMLFormElement>) : Promise<void>
    {
        event.preventDefault();

        const obj = { login:loginName, password:loginPassword };
        const js = JSON.stringify(obj);

        try 
        {
            const response = await fetch(buildPath('api/login'), {method:'POST', body:js, headers:{'Content-Type':'application/json'}});

            const res = JSON.parse(await response.text());
            if(!(res.error === undefined)) {
                setMessage('User/Password combination incorrect');
                return;
            }

            const { accessToken } = res;
            storeToken(res);

            const decoded = jwtDecode<UserPayload>(accessToken);

            try
            {
                const ud = decoded;
                const userId = ud.userId;
                const firstName = ud.firstName;
                const lastName = ud.lastName;

                if(userId <= 0)
                {
                    setMessage('User/Password combination incorrect');
                }
                else
                {
                    const user = {firstName:firstName, lastName:lastName, id:userId}
                    localStorage.setItem('user_data', JSON.stringify(user));

                    setMessage('');

                    window.location.href = '/dashboard';
                }
            }
            catch(e)
            {
                console.log(e);
                return;
            }
        }
        catch(error: unknown)
        {
            if (error instanceof Error) {
                alert(error.toString());
            } else {
                alert('An unknown error occurred.');
            }
            return;
        }
    };

    function handleSetLoginName(event: React.ChangeEvent<HTMLInputElement>) : void
    {
        setLoginName(event.target.value);
    }

    function handleSetPassword(event: React.ChangeEvent<HTMLInputElement>) : void
    {
        setPassword(event.target.value);
    }

    function handleRegisterRedirect() {
        navigation('/register');
    };

    return (
    <div className="login-page-wrapper">
        <div id="loginDiv">
            <span id="inner-title">CAMPUS QUEST</span>
            <p style={{ fontSize: '18px', color: '#555', marginTop: '-10px' }}>Please log in to continue</p><br />
            <form onSubmit={doLogin}>
                <div>
                <input type="text" id="loginName" placeholder="Username" onChange={handleSetLoginName}/>
                <input type="password" id="loginPassword" placeholder="Password" onChange={handleSetPassword}/>
                </div><br />
                <input type="submit" id="loginButton" className="buttons" value="Login" />
            </form>
            <span id="loginResult">{message}</span><br />
            <button id="registerRedirect" onClick={handleRegisterRedirect}>Create a new account</button>
        </div>
    </div>
    );

};

export default LoginPage;