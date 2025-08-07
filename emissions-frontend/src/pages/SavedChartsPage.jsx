import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function SavedChartsPage() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/charts/')
      .then(res => setCharts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (!charts.length) return <p>No saved charts.</p>;

  return (
    <div style={{ padding: '1rem', maxWidth: 700, margin: 'auto' }}>
      <h1>Your Saved Charts</h1>
      <ul>
        {charts.map(c => (
          <li key={c.id}>
            <Link to={`/chart/${c.id}`}>{c.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
