import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import EmissionsChart from '../components/EmissionsChart';

export default function ChartViewPage() {
  const { id } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/charts/${id}/`)
      .then(res => setConfig(res.data.config))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading chart…</p>;
  if (!config) return <p>Chart not found.</p>;

  return (
    <div style={{ padding: '1rem', maxWidth: 900, margin: 'auto' }}>
      <h1>Viewing: {`Chart #${id}`}</h1>
      <EmissionsChart config={config} />
    </div>
  );
}
