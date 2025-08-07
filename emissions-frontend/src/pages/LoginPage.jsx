// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL;

export default function LoginPage({ setIsAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate                 = useNavigate();

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    axios.post(`${API}/api/token/`, { username, password })
      .then(res => {
        // store tokens
        localStorage.setItem('access_token',  res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        // set default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
        setIsAuth(true);
        navigate('/');  // back to home
      })
      .catch(() => {
        setError('Invalid username or password');
      });
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem',
                  background: 'white', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
          />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Log In
        </button>
      </form>
    </div>
  );
}
