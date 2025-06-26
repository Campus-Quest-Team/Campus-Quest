import React, { useState } from 'react';
import { buildPath } from './Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

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

                    window.location.href = '/cards';
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

    return (
        <div id="loginDiv">
            <span id="inner-title">PLEASE LOG IN</span><br />
            <input type="text" id="loginName" placeholder="Username" onChange={handleSetLoginName}/><br />
            <input type="password" id="loginPassword" placeholder="Password" onChange={handleSetPassword}/><br />
            <input type="submit" id="loginButton" className="buttons" value="Do It" onClick={doLogin} />
            <span id="loginResult">{message}</span>
        </div>
    );
};

export default Login;