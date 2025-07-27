import React, { useState } from 'react';
import { storeLogin } from '../loginStorage';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import buildPath from '../components/Path';
import '../styles/Login.css';
import type { LoginInfo, UserPayload } from '../types/APITypes';
import ForgotPasswordPopup from '../components/login/ForgotPasswordPopup';
import fullLogo from '../assets/full_logo.svg';

function LoginPage() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const navigate = useNavigate();
  const [showForgotPopup, setShowForgotPopup] = useState(false);




  async function doLogin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const credentials = {
      login: loginName.trim(),
      password: loginPassword.trim(),
    };

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok || data.error || !data.accessToken) {
        setMessage('User/Password combination incorrect');
        return;
      }

      const decoded = jwtDecode<UserPayload>(data.accessToken);

      // Validate decoded userId as a 24-char MongoDB ObjectId
      if (typeof decoded.userId !== 'string' || decoded.userId.length !== 24) {
        setMessage('Invalid user ID');
        return;
      }

      // Save to local storage using storeLogin()
      const loginInfo: LoginInfo = {
        accessToken: data.accessToken,
        userId: decoded.userId,
      };
      storeLogin(loginInfo);

      setMessage('');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      setMessage('Something went wrong. Please try again.');
    }
  }


  return (
    <div className="login-page-wrapper">
      <div id="loginDiv">
        <img src={fullLogo} alt="Campus Quest Logo" className="campus-quest-logo" />
        <p className="login-subtitle">Please log in to continue</p>
        <form onSubmit={doLogin} className="login-form">
          <input type="text" placeholder="Username" value={loginName} onChange={(e) => setLoginName(e.target.value)} required />
          <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          <input type="submit" value="Login" className="login-button" />
        </form>
        <span id="loginResult">{message}</span>
        <div className="button-row">
          <button id="registerRedirect" onClick={() => navigate('/register')}>
            Create a new account
          </button>
          <button id="forgot-link" onClick={() => setShowForgotPopup(true)}>
            Forgot password?
          </button>
        </div>

        {showForgotPopup && <ForgotPasswordPopup onClose={() => setShowForgotPopup(false)} />}
      </div>
    </div>
  );
}

export default LoginPage;
