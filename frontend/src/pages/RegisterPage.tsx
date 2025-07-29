import React, { useState } from 'react';
import BadWordsChecker from '../components/BadWordsChecker';
import { jwtDecode } from 'jwt-decode';
import buildPath from '../components/Path';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import { toast } from 'react-toastify';

interface UserPayload {
  userId: number;
  firstName: string;
  lastName: string;
  iat: number;
}

function RegisterPage() {
  const [message, setMessage] = useState('');
  const [registerName, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFName, setRegisterFName] = useState('');
  const [registerLName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const navigate = useNavigate();

  const [errors, setErrors] = useState({
    username: false,
    password: false,
    firstName: false,
    email: false,
  });


  async function doRegister(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setMessage('');

    setErrors({
      username: false,
      password: false,
      firstName: false,
      email: false,
    });

    if (registerName.length < 2) {
      setErrors(prev => ({ ...prev, username: true }));
      toast.error('Username must have 2+ characters');
      return;
    }
    if (registerPassword.length < 5) {
      setErrors(prev => ({ ...prev, password: true }));
      toast.error('Password must have 5+ characters');
      return;
    }
    if (registerFName.length < 2) {
      setErrors(prev => ({ ...prev, firstName: true }));
      toast.error('First name must have 2+ characters');
      return;
    }
    if (!registerEmail.includes('@') || !registerEmail.includes('.')) {
      setErrors(prev => ({ ...prev, email: true }));
      toast.error('Invalid email format');
      return;
    }

    if (BadWordsChecker(registerName) || BadWordsChecker(registerFName) || BadWordsChecker(registerLName)) {
      toast.warn("It's okay to spread positivity too, you know?");
      return;
    }

    const packet = {
      login: registerName,
      password: registerPassword,
      firstName: registerFName,
      lastName: registerLName,
      email: registerEmail,
    };

    // 👇 Add loading toast here
    const loadingToast = toast.loading('Creating your account...');

    try {
      const res = await fetch(buildPath('api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      });

      const data = JSON.parse(await res.text());

      if (data.error) {
        toast.update(loadingToast, { render: data.error, type: 'error', isLoading: false, autoClose: 3000 });
        return;
      }

      const { accessToken } = data;
      const decoded = jwtDecode<UserPayload>(accessToken);

      const emailRes = await fetch(buildPath('api/email/emailSend'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: registerName,
          email: registerEmail,
          userId: decoded.userId,
          jwtToken: accessToken,
        }),
      });

      const emailData = JSON.parse(await emailRes.text());

      if (emailData.error) {
        toast.update(loadingToast, { render: emailData.error, type: 'error', isLoading: false, autoClose: 3000 });
        return;
      }

      toast.update(loadingToast, {
        render: 'Account created! Check your email to verify ✅',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      setMessage('');
    } catch (err) {
      console.error(err);
      toast.update(loadingToast, {
        render: 'Something went wrong. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  }


  return (
    <div className="login-page-wrapper">
      <div id="loginDiv">
        <span id="inner-title">New Account</span>
        <p className="login-subtitle">Join Campus Quest today!</p>
        <form onSubmit={doRegister} className="login-form">
          <input
            type="text"
            placeholder="Username"
            className={errors.username ? 'input-error' : ''}
            onChange={(e) => setRegisterUsername(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="First Name"
            className={errors.firstName ? 'input-error' : ''}
            onChange={(e) => setRegisterFName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className={errors.email ? 'input-error' : ''}
            onChange={(e) => setRegisterEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className={errors.password ? 'input-error' : ''}
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
          />

          <input type="submit" value="Register" className="login-button" />
        </form>
        <span id="registerResult">{message}</span>
        <button id="registerRedirect" onClick={() => navigate('/login')}>
          Already have an account?
        </button>
      </div>
    </div>
  );
}

export default RegisterPage;