// src/pages/ChartBuilderPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import CountrySelector from '../components/CountrySelector';
import YearSelector    from '../components/YearSelector';
import YearRangeSlider from '../components/YearRangeSlider';
import BasisToggle     from '../components/BasisToggle';
import SummaryCard     from '../components/SummaryCard';
import EmissionsChart  from '../components/EmissionsChart';

const API = import.meta.env.VITE_API_BASE_URL;

export default function ChartBuilderPage({ isAuth }) {
  // --- Core state (same as before) ---
  const [countries,        setCountries]      = useState([]);
  const [selectedCountry,  setSelectedCountry]= useState('');
  const [emissionsData,    setEmissionsData]  = useState([]);
  const [years,            setYears]          = useState([]);
  const [selectedYear,     setSelectedYear]   = useState('');
  const [viewMode,         setViewMode]       = useState('absolute');

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
      setEmissionsData(arr);

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

  // helper: build summary for the selected year & viewMode
  const summary = (() => {
    if (!selectedYear) return null;
    const terr = emissionsData.find(d =>
      d.basis === 'territorial' && d.year === selectedYear
    );
    const cons = emissionsData.find(d =>
      d.basis === 'consumption' && d.year === selectedYear
    );
    if (!terr || !cons) return null;

    return viewMode === 'absolute'
      ? { territorial: terr.value, consumption: cons.value }
      : {
          territorial: terr.per_capita * scaleFactor,
          consumption: cons.per_capita * scaleFactor
        };
  })();

  // helper: prepare trend data across years
  const trendData = years.map(year => {
    const terr = emissionsData.find(d =>
      d.basis === 'territorial' && d.year === year
    );
    const cons = emissionsData.find(d =>
      d.basis === 'consumption' && d.year === year
    );
    return {
      year,
      territorial: viewMode === 'absolute'
        ? terr?.value
        : terr?.per_capita * scaleFactor,
      consumption: viewMode === 'absolute'
        ? cons?.value
        : cons?.per_capita * scaleFactor
    };
  });

  const startNum = Number(rangeStart);
  const endNum   = Number(rangeEnd);
  const isRangeValid = startNum <= endNum;
  const filteredTrendData = isRangeValid
    ? trendData.filter(d => d.year >= startNum && d.year <= endNum)
    : [];

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
      .then(() => alert('Chart saved!'))
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
      {' '}
      <BasisToggle
        viewMode={viewMode}
        onChange={setViewMode}
      />

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

      {summary && (
        <div className="summary-card">
            <SummaryCard
                territorial={summary.territorial}
                consumption={summary.consumption}
                unitLabel={unitLabel}
            />
        </div>
      )}

      <div style={{ width: '100%' }}>
        <EmissionsChart
          data={filteredTrendData}
          unitLabel={unitLabel}
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
