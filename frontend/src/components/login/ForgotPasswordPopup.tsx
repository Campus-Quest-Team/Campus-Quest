import React, { useState } from 'react';
import { toast } from 'react-toastify'; // make sure this is already imported
import buildPath from '../Path';
import '../../styles/ForgotPassword.css';

export default function ForgotPasswordPopup({ onClose }: { onClose: () => void; }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const loadingToastId = toast.loading('Sending reset link...');

        try {
            const response = await fetch(buildPath('api/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            const resultMessage = data.message || 'Check your email for reset instructions.';

            toast.update(loadingToastId, {
                render: resultMessage,
                type: 'success',
                isLoading: false,
                autoClose: 4000,
            });

            setMessage(resultMessage);
            setSubmitted(true);
        } catch (error: unknown) {
            const errMessage =
                error instanceof Error ? error.message : 'Something went wrong. Please try again.';

            toast.update(loadingToastId, {
                render: errMessage,
                type: 'error',
                isLoading: false,
                autoClose: 4000,
            });

            setMessage(errMessage);
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