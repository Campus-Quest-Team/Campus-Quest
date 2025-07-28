import React, { useState } from 'react';
import buildPath from '../Path';
import '../../styles/ForgotPassword.css';

export default function ForgotPasswordPopup({ onClose }: { onClose: () => void; }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch(buildPath('api/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            setMessage(data.message || 'Check your email for reset instructions.');
            setSubmitted(true);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setMessage(error.message);
            } else {
                setMessage('Something went wrong. Please try again.');
            }
        }
    };

    return (
        <div className="forgot-popup-overlay">
            <div className="forgot-popup">
                <h2 className="forgot-title">Password Reset</h2>
                {submitted ? (
                    <>
                        <p className="forgot-message">{message}</p>
                        <button onClick={onClose}>Close</button>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="button-row">
                            <button type="submit">Send Reset Link</button>
                            <button type="button" onClick={onClose}>Cancel</button>
                        </div>
                        {message && <p className="error-msg">{message}</p>}
                    </form>
                )}
            </div>
        </div>
    );
}