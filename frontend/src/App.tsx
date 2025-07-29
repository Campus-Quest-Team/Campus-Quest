// import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './styles/App.css';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import VerifyPage from './pages/VerifyPage.tsx';
import Dashboard from './pages/Dashboard.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* ✅ Toasts will show up globally */}
        <ToastContainer position="top-center" autoClose={3000} aria-label="Notification Toasts" />
      </>
    </Router>
  );
}

export default App;
