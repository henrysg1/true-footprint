// src/pages/ChartBuilderPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import CountrySelector from '../components/CountrySelector';
import YearRangeSlider from '../components/YearRangeSlider';
import BasisToggle     from '../components/BasisToggle';
import SummaryCard     from '../components/SummaryCard';
import EmissionsChart  from '../components/EmissionsChart';
import MetricMultiSelect from '../components/MetricMultiSelect';

const API = import.meta.env.VITE_API_BASE_URL;

export default function ChartBuilderPage({ isAuth }) {
  const navigate = useNavigate();
  // --- Core state ---
  const [countries,        setCountries]      = useState([]);
  const [selectedCountry,  setSelectedCountry]= useState('');
  const [years,            setYears]          = useState([]);
  const [selectedYear,     setSelectedYear]   = useState('');
  const [viewMode,         setViewMode]       = useState('absolute');

  const [allIndicators, setAllIndicators] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['co2']);
  const [tsData, setTsData] = useState([]);
  const [unitsMap, setUnitsMap] = useState({});

  // --- Save button state ---
  const [saving,           setSaving]         = useState(false);
  const [saveError,        setSaveError]      = useState(null);

  // --- Year range state ---
  const [rangeStart,        setRangeStart]     = useState('');
  const [rangeEnd,        setRangeEnd]       = useState('');

  // --- Derived labels & scale ---
  const unitLabel   = viewMode === 'absolute'
    ? 'Mt CO₂'
    : 't CO₂ per person';
  const scaleFactor = viewMode === 'absolute' ? 1 : 1_000_000;

  useEffect(() => {
    axios.get(`${API}/api/indicators/`)
    .then(res => {
      const list = Array.isArray(res.data) ? res.data : res.data.results || res.data;
       // Optional: filter to a curated subset if you prefer
      setAllIndicators(list);
     })
     .catch(console.error);
  }, []);

  // 1) load country list
  useEffect(() => {
    axios.get(`${API}/api/countries/`)
      .then(res => {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];
        list.sort((a, b) => a.name.localeCompare(b.name));

        setCountries(list);
        if (list.length) setSelectedCountry(list[0].iso_code);
      })
      .catch(console.error);
  }, []);

  // 2) when country changes, load its emissions
  useEffect(() => {
    if (!selectedCountry) return;
    axios.get(`${API}/api/emissions/`, {
      params: { country__iso_code: selectedCountry }
    })
    .then(res => {
      const arr = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      const yrs = Array.from(new Set(arr.map(d => d.year))).sort();
      setYears(yrs);

    if (yrs.length) {
        const first = String(yrs[0]);
        const last  = String(yrs[yrs.length-1]);
        setSelectedYear(last);
        setRangeStart(first);
        setRangeEnd(last);
    }
    })
    .catch(console.error);
  }, [selectedCountry]);

  const startNum = Number(rangeStart);
  const endNum   = Number(rangeEnd);
  const isRangeValid = !Number.isNaN(startNum) && !Number.isNaN(endNum) && startNum <= endNum;

  useEffect(() => {
    if (!selectedCountry || !selectedMetrics.length || !isRangeValid) {
      setTsData([]); setUnitsMap({});
      return;
    }
    axios.get(`${API}/api/observations/timeseries/`, {
      params: {
        country__iso_code: selectedCountry,
        indicators: selectedMetrics.join(','),
        year_min: startNum,
        year_max: endNum
      }
    })
    .then(res => {
      setTsData(res.data?.data || []);
      setUnitsMap(res.data?.units || {});
    })
    .catch(console.error);
  }, [selectedCountry, selectedMetrics, startNum, endNum, isRangeValid]);

  const yearForSummary = Number(selectedYear) || endNum;
  const row = tsData.find(r => r.year === yearForSummary) || tsData[tsData.length - 1];

  const summary = row ? {
    // show the first two selected metrics, if present
    aLabel: selectedMetrics[0],
    aValue: row[selectedMetrics[0]],
    bLabel: selectedMetrics[1],
    bValue: row[selectedMetrics[1]],
  } : null;

  // Save handler
  const saveChart = () => {
    const name = prompt('Enter a name for this chart:');
    if (!name) return;

    setSaving(true);
    setSaveError(null);

    // We’ll store just the minimal config needed to reproduce it:
    const config = {
      country: selectedCountry,
      year: Number(selectedYear),
      viewMode,
    };

    axios.post(`${API}/api/charts/`, { name, config })
      .then(res => {
        navigate(`/chart/${res.data.id}`);
      })
      .catch(err => setSaveError(err.response?.data || err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 900,
        margin: '2rem auto',
        padding: '0 1rem'
      }}
    >
      <h1>Build a Custom Emissions Chart</h1>

      <CountrySelector
        countries={countries}
        selected={selectedCountry}
        onChange={setSelectedCountry}
      />

      <div style={{ width:'100%', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <MetricMultiSelect
          indicators={allIndicators}
          value={selectedMetrics}
          onChange={setSelectedMetrics}
        />
      </div>

      {years.length > 0 && (
       <>
         <YearRangeSlider
           min={years[0]}
           max={years[years.length - 1]}
           values={[startNum, endNum]}
           onChange={([s, e]) => {
             setRangeStart(String(s));
             setRangeEnd(String(e));
           }}
         />
         <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
           <div>
             <label>From: </label>
             <input
               type="number"
               value={rangeStart}
               min={years[0]}
               max={years[years.length - 1]}
               onChange={e => setRangeStart(e.target.value)}
               style={{ width: '4rem' }}
             />
           </div>
           <div>
             <label>To: </label>
             <input
               type="number"
               value={rangeEnd}
               min={years[0]}
               max={years[years.length - 1]}
               onChange={e => setRangeEnd(e.target.value)}
               style={{ width: '4rem' }}
             />
           </div>
         </div>
         {!isRangeValid && (
           <p style={{ color:'red', textAlign: 'center' }}>
             Start year must be ≤ end year
           </p>
         )}
       </>
     )}

    <div style={{ width: '100%' }}>
      <EmissionsChart
        data={tsData}
        unitsMap={unitsMap}
        seriesKeys={selectedMetrics}
      />
    </div>

      {isAuth ? (
        <button
          onClick={saveChart}
          disabled={saving || !summary}
          style={{ marginTop: '1rem' }}
          className="save-btn"
        >
          {saving ? 'Saving…' : 'Save Chart'}
        </button>
      ) : (
        <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
          Log in to save your chart configuration.
        </p>
      )}

      {saveError && (
        <p style={{ color: 'red' }}>
          Save failed: {JSON.stringify(saveError)}
        </p>
      )}
    </div>
  );
}
