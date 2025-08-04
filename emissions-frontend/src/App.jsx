import React, { useState, useEffect } from 'react';
import axios from 'axios';

import CountrySelector from './components/CountrySelector';
import YearSelector    from './components/YearSelector';
import BasisToggle     from './components/BasisToggle';
import SummaryCard     from './components/SummaryCard';
import EmissionsChart  from './components/EmissionsChart';

const API = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [countries, setCountries]       = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [emissionsData, setEmissionsData]     = useState([]);
  const [years, setYears]               = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [viewMode, setViewMode]         = useState('absolute');

  const unitLabel = viewMode === 'absolute' ? 'Mt CO₂' : 't CO₂ per person';
  const scaleFactor = viewMode === 'absolute' ? 1 : 1_000_000;

  // 1) load country list
  useEffect(() => {
    axios.get(`${API}/api/countries/`)
      .then(res => {
        // if DRF is paginating, use `res.data.results`, otherwise `res.data`
        const list = res.data.results || res.data;
        list.sort((a, b) => a.name.localeCompare(b.name));

        setCountries(list);
        if (list.length) setSelectedCountry(list[0].iso_code);
      })
      .catch(console.error);
  }, []);

  // 2) when country changes, load all its emissions
  useEffect(() => {
    if (!selectedCountry) return;
    axios.get(`${API}/api/emissions/`, {
      params: { country__iso_code: selectedCountry }
    })
    .then(res => {
        const arr = res.data.results || res.data;
        setEmissionsData(arr);
        const yrs = Array.from(new Set(arr.map(d => d.year)));
      setYears(yrs);
      setSelectedYear(String(yrs[yrs.length - 1]));
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

    if (viewMode === 'absolute') {
      return { territorial: terr.value, consumption: cons.value };
    } else {
      return { territorial: terr.per_capita * scaleFactor, consumption: cons.per_capita * scaleFactor};
    }
  })();

  // helper: prepare trend data across years
  const trendData = (() => {
    return years.map(year => {
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
  })();

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 2000,
        margin: '2rem auto',
        padding: '0 1rem'
      }}>
      <h1>Emissions Dashboard</h1>

      <CountrySelector
        countries={countries}
        selected={selectedCountry}
        onChange={setSelectedCountry}
      />

      {' '}

      <YearSelector
        years={years}
        selected={selectedYear}
        onChange={setSelectedYear}
      />

      <BasisToggle
        viewMode={viewMode}
        onChange={setViewMode}
      />

      {summary && (
        <SummaryCard
          {...summary}
          viewMode={viewMode}
          unitLabel={unitLabel}
        />
      )}

      <div style={{ width: '100%' /* ensures chart uses full container width */ }}>
        <EmissionsChart data={trendData} unitLabel={unitLabel} />
      </div>
    </div>
  );
}

export default App;
