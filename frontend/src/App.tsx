//import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage.tsx';
import CardPage from './pages/CardPage.tsx';

function App() {
  return (
    <Router >
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cards" element={<CardPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
export default App;