//import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage.tsx';
import CardPage from './pages/CardPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import VerifyPage from './pages/VerifyPage.tsx';

function App() {
  return (
    <Router >
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cards" element={<CardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
export default App;