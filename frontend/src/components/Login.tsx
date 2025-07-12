import React, { useState } from 'react';
import { buildPath } from './Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

interface UserPayload {
    userId: number;
    firstName: string;
    lastName: string;
    iat: number;
}

function Login()
{
    const [message, setMessage] = useState('');
    const [loginName, setLoginName] = React.useState('');
    const [loginPassword, setPassword] = React.useState('');
    const navigation = useNavigate();

    async function doLogin(event:any) : Promise<void>
    {
        event.preventDefault();

        var obj = { login:loginName, password:loginPassword };
        var js = JSON.stringify(obj);

        try 
        {
            const response = await fetch(buildPath('api/login'), {method:'POST', body:js, headers:{'Content-Type':'application/json'}});

            var res = JSON.parse(await response.text());
            if(!(res.error === undefined)) {
                setMessage('User/Password combination incorrect');
                return;
            }

            const { accessToken } = res;
            storeToken(res);

            const decoded = jwtDecode<UserPayload>(accessToken);

            try
            {
                var ud = decoded;
                var userId = ud.userId;
                var firstName = ud.firstName;
                var lastName = ud.lastName;

                if(userId <= 0)
                {
                    setMessage('User/Password combination incorrect');
                }
                else
                {
                    var user = {firstName:firstName, lastName:lastName, id:userId}
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
        catch(error:any)
        {
            alert(error.toString());
            return;
        }
    };

    function handleSetLoginName(event:any) : void
    {
        setLoginName(event.target.value);
    }

    function handleSetPassword(event:any) : void
    {
        setPassword(event.target.value);
    }

    function handleRegisterRedirect() {
        navigation('/register');
    };

    return (
        <div id="loginDiv">
            <span id="inner-title">PLEASE LOG IN</span><br /><br />
            <form>
                <div>
                    <label>Username:</label><br />
                    <input type="text" id="loginName" placeholder="Username" onChange={handleSetLoginName}/>
                </div><br />
                <div>
                    <label>Password:</label><br />
                    <input type="password" id="loginPassword" placeholder="Password" onChange={handleSetPassword}/>
                </div><br />
                <input type="submit" id="loginButton" className="buttons" value="Login" onClick={doLogin} />
            </form>
            <span id="loginResult">{message}</span><br />
            <button id="registerRedirect" onClick={handleRegisterRedirect}>Create a new account</button>
        </div>
    );
};

export default Login;