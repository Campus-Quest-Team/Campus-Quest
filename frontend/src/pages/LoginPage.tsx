import React, { useState } from 'react';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import buildPath from '../components/Path';
import '../styles/Login.css';

interface UserPayload {
  userId: number;
  firstName: string;
  lastName: string;
  iat: number;
}

function LoginPage() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const navigate = useNavigate();

  async function doLogin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const credentials = { login: loginName, password: loginPassword };

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const res = JSON.parse(await response.text());

      if (res.error) {
        setMessage('User/Password combination incorrect');
        return;
      }

      const { accessToken } = res;
      storeToken(res);

      const decoded = jwtDecode<UserPayload>(accessToken);
      if (decoded.userId <= 0) {
        setMessage('User/Password combination incorrect');
        return;
      }

      const user = {
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        id: decoded.userId,
      };
      localStorage.setItem('user_data', JSON.stringify(user));

      setMessage('');
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      alert(error instanceof Error ? error.toString() : 'An unknown error occurred.');
    }
  }

  return (
    <div className="login-page-wrapper">
      <div id="loginDiv">
        <span id="inner-title">Campus Quest</span><br /><br />
        <p className="login-subtitle">Please log in to continue</p>
        <form onSubmit={doLogin} className="login-form">
          <input type="text" placeholder="Username" value={loginName} onChange={(e) => setLoginName(e.target.value)} required />
          <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          <input type="submit" value="Login" className="login-button" />
        </form>
        <span id="loginResult">{message}</span>
        <button id="registerRedirect" onClick={() => navigate('/register')}>
          Create a new account
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
