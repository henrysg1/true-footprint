// src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header({ isAuth, onLogout }) {
  const nav = useNavigate();
  return (
    <header className="header">
      <div className="logo" onClick={() => nav('/')}>TrueFootprint</div>
      <nav>
        <Link to="/">Build</Link>
        <Link to="/saved">Saved</Link>
      </nav>
      {isAuth ? (
        <button className="login-btn" onClick={onLogout}>
          Logout
        </button>
      ) : (
        <button className="login-btn" onClick={() => nav('/login')}>
          Login
        </button>
      )}
    </header>
  );
}
