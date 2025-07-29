import React, { useState, lazy, Suspense } from 'react';
import buildPath from '../components/Path';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

import { storeLogin } from '../loginStorage';
import '../styles/Login.css';
import type { LoginInfo, UserPayload } from '../types/APITypes';
import fullLogo from '../assets/full_logo.svg';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const ForgotPasswordPopup = lazy(() => import('../components/login/ForgotPasswordPopup'));


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
        toast.error('User/Password combination incorrect');
        setMessage('User/Password combination incorrect');
        return;
      }

      const decoded = jwtDecode<UserPayload>(data.accessToken);
      if (typeof decoded.userId !== 'string' || decoded.userId.length !== 24) {
        toast.error('Invalid user ID');
        setMessage('Invalid user ID');
        return;
      }

      const loginInfo: LoginInfo = {
        accessToken: data.accessToken,
        userId: decoded.userId,
      };
      storeLogin(loginInfo);

      toast.success('Login successful!');
      setMessage('');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Something went wrong. Please try again.');
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

        {showForgotPopup && (
          <Suspense fallback={<div>Loading...</div>}>
            <ForgotPasswordPopup onClose={() => setShowForgotPopup(false)} />
          </Suspense>
        )}</div>
    </div>
  );
}

export default LoginPage;
