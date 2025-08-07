import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';

import Header             from './components/Header';
import ChartBuilderPage   from './pages/ChartBuilderPage';
import SavedChartsPage    from './pages/SavedChartsPage';
import ChartViewPage      from './pages/ChartViewPage';
import LoginPage          from './pages/LoginPage';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);

  // on mount, see if we have a token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuth(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuth(false);
  };

  return (
    <div className="app-container">
      <Header
        isAuth={isAuth}
        onLogin={() => {}}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<ChartBuilderPage isAuth={isAuth} />}
          />
          <Route
            path="/login"
            element={<LoginPage setIsAuth={setIsAuth} />}
          />
          <Route
            path="/saved"
            element={<SavedChartsPage />}
          />
          <Route
            path="/chart/:id"
            element={<ChartViewPage />}
          />
        </Routes>
      </main>
    </div>
  );
}
