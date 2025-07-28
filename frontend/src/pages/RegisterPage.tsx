import React, { useState } from 'react';
import BadWordsChecker from '../components/BadWordsChecker';
import { jwtDecode } from 'jwt-decode';
import buildPath from '../components/Path';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

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
      return setMessage('Username must have 2+ characters');
    }
    if (registerPassword.length < 5) {
      setErrors(prev => ({ ...prev, password: true }));
      return setMessage('Password must have 5+ characters');
    }
    if (registerFName.length < 2) {
      setErrors(prev => ({ ...prev, firstName: true }));
      return setMessage('First name must have 2+ characters');
    }
    if (!registerEmail.includes('@') || !registerEmail.includes('.')) {
      setErrors(prev => ({ ...prev, email: true }));
      return setMessage('Invalid email format');
    }

    if (BadWordsChecker(registerName) || BadWordsChecker(registerFName) || BadWordsChecker(registerLName))
      return setMessage("It's okay to spread positivity too, you know?");

    const packet = {
      login: registerName,
      password: registerPassword,
      firstName: registerFName,
      lastName: registerLName,
      email: registerEmail,
    };

    try {
      const res = await fetch(buildPath('api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      });

      const data = JSON.parse(await res.text());
      if (data.error) return setMessage(data.error);

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
      if (emailData.error) return setMessage(emailData.error);

      setMessage('Account created! Check your email to verify your account. ✅');
      alert('Registration successful!\nPlease check your email to verify your account.');

    } catch (err) {
      alert(String(err));
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
