// src/pages/ChartBuilderPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

import CountrySelector    from '../components/CountrySelector';
import YearRangeSlider    from '../components/YearRangeSlider';
import EmissionsChart     from '../components/EmissionsChart';
import MetricMultiSelect  from '../components/MetricMultiSelect';

const API = import.meta.env.VITE_API_BASE_URL;

export default function ChartBuilderPage({ isAuth }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // core state
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  const [allIndicators, setAllIndicators] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['co2']);
  const [tsData, setTsData] = useState([]);
  const [unitsMap, setUnitsMap] = useState({});

  // range
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // saved charts
  const [myCharts, setMyCharts] = useState([]);
  const [loadSelectValue, setLoadSelectValue] = useState('');   // controls the <select>
  const [loadedChartId, setLoadedChartId] = useState(null);     // currently loaded chart id
  const [loadedChartName, setLoadedChartName] = useState('');   // its name
  const [loadedSnapshot, setLoadedSnapshot] = useState(null);   // frozen config for dirty check

  // saving feedback
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justSavedId, setJustSavedId] = useState(null);

  // indicators
  useEffect(() => {
    axios.get(`${API}/api/indicators/`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data.results || res.data;
        setAllIndicators(list);
      })
      .catch(console.error);
  }, []);

  // countries
  useEffect(() => {
    axios.get(`${API}/api/countries/`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data.results || [];
        list.sort((a,b)=>a.name.localeCompare(b.name));
        setCountries(list);
        if (list.length) setSelectedCountry(list[0].iso_code);
      })
      .catch(console.error);
  }, []);

  // list my charts
  const refreshMyCharts = useCallback(() => {
    if (!isAuth) { setMyCharts([]); return; }
    axios.get(`${API}/api/charts/?mine=1`)
      .then(res => setMyCharts(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(() => setMyCharts([]));
  }, [isAuth]);

  useEffect(() => { refreshMyCharts(); }, [refreshMyCharts]);

  // derive years for country
  useEffect(() => {
    if (!selectedCountry) return;
    axios.get(`${API}/api/emissions/`, { params: { country__iso_code: selectedCountry }})
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : res.data.results || [];
        const yrs = Array.from(new Set(arr.map(d => d.year))).sort();
        setYears(yrs);
        if (yrs.length) {
          const first = String(yrs[0]);
          const last  = String(yrs[yrs.length-1]);
          setSelectedYear(prev => prev || last);
          setRangeStart(prev => prev || first);
          setRangeEnd(prev => prev || last);
        }
      })
      .catch(console.error);
  }, [selectedCountry]);

  // range validation
  const startNum = Number(rangeStart);
  const endNum   = Number(rangeEnd);
  const isRangeValid = !Number.isNaN(startNum) && !Number.isNaN(endNum) && startNum <= endNum;

  // fetch timeseries
  useEffect(() => {
    if (!selectedCountry || !selectedMetrics.length || !isRangeValid) {
      setTsData([]); setUnitsMap({}); return;
    }
    axios.get(`${API}/api/observations/timeseries/`, {
      params: {
        country__iso_code: selectedCountry,
        indicators: selectedMetrics.join(','),
        year_min: startNum,
        year_max: endNum
      }
    }).then(res => {
      setTsData(res.data?.data || []);
      setUnitsMap(res.data?.units || {});
    }).catch(console.error);
  }, [selectedCountry, selectedMetrics, startNum, endNum, isRangeValid]);

  // current config (normalized)
  const currentConfig = useCallback(() => ({
    country: selectedCountry,
    range: { start: startNum, end: endNum },
    metrics: selectedMetrics
  }), [selectedCountry, startNum, endNum, selectedMetrics]);

  // dirty check – controls the select value label
  useEffect(() => {
    if (!loadedChartId || !loadedSnapshot) {
      setLoadSelectValue('');
      return;
    }
    const dirty =
      JSON.stringify(currentConfig()) !== JSON.stringify(loadedSnapshot);

    // When dirty, show a synthetic option "{name} (unsaved)"
    setLoadSelectValue(dirty ? '__unsaved__' : String(loadedChartId));
  }, [currentConfig, loadedChartId, loadedSnapshot]);

  // hydrate from config
  function hydrateFromConfig(config) {
    if (!config) return;
    if (config.country) setSelectedCountry(config.country);
    if (config.metrics?.length) setSelectedMetrics(config.metrics);
    if (config.range?.start != null) setRangeStart(String(config.range.start));
    if (config.range?.end != null) {
      setRangeEnd(String(config.range.end));
      setSelectedYear(String(config.range.end));
    }
  }

  // load by id (from dropdown or ?chart=)
  function loadChartById(id) {
    if (!id) return;
    axios.get(`${API}/api/charts/${id}/`)
      .then(res => {
        const { id: cid, name, config } = res.data || {};
        hydrateFromConfig(config);
        setLoadedChartId(cid);
        setLoadedChartName(name || '');
        setLoadedSnapshot(config || null);
        setLoadSelectValue(String(cid));      // show name in select via value match
        setSearchParams({ chart: String(cid) });
      })
      .catch(err => {
        console.error(err);
        alert('Chart not found or not accessible.');
      });
  }

  // deep link
  useEffect(() => {
    const id = searchParams.get('chart');
    if (id) loadChartById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save (UPSERT by name)
  const saveChart = async () => {
    if (!isAuth) return alert('Please log in to save.');
    setSaving(true);
    setSaveError(null);
    try {
      if (loadedChartId) {
        const res = await axios.patch(`${API}/api/charts/${loadedChartId}/`, {
          config: currentConfig()
        });
        setLoadedSnapshot(currentConfig());
        setJustSavedId(res.data.id);
        // URL remains at ?chart=<id>; dropdown effect will switch off (unsaved)
      } else {
        const defaultName = 'My chart';
        const name = prompt('Chart name:', defaultName);
        if (!name) return;
        const res = await axios.post(`${API}/api/charts/upsert/`, {
          name,
          config: currentConfig()
        });
        const c = res.data;
        setLoadedChartId(c.id);
        setLoadedChartName(c.name);
        setLoadedSnapshot(currentConfig());
        setSearchParams({ chart: String(c.id) });
        refreshMyCharts();
        setJustSavedId(c.id);
      }
    } catch (err) {
      setSaveError(err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save as: always prompt for a (new) name and create/upsert under that name
  const saveAsChart = async () => {
    if (!isAuth) return alert('Please log in to save.');
    const suggested = loadedChartName ? `${loadedChartName} copy` : 'My chart';
    const name = prompt('Save as name:', suggested);
    if (!name) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await axios.post(`${API}/api/charts/upsert/`, {
        name,
        config: currentConfig()
      });
      const c = res.data;
      setLoadedChartId(c.id);
      setLoadedChartName(c.name);
      setLoadedSnapshot(currentConfig());
      setSearchParams({ chart: String(c.id) });
      refreshMyCharts();
      setJustSavedId(c.id);
    } catch (err) {
      setSaveError(err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Rename
  const renameChart = () => {
    if (!isAuth || !loadedChartId) return;
    const newName = prompt('New name:', loadedChartName || '');
    if (!newName || newName === loadedChartName) return;
    axios.patch(`${API}/api/charts/${loadedChartId}/`, { name: newName })
      .then(res => {
        setLoadedChartName(res.data.name);
        refreshMyCharts();
      })
      .catch(err => {
        const msg = err.response?.data || err.message;
        alert(`Rename failed: ${JSON.stringify(msg)}`);
      });
  };

  // Delete
  const deleteChart = () => {
    if (!isAuth || !loadedChartId) return;
    if (!confirm(`Delete "${loadedChartName}"?`)) return;
    axios.delete(`${API}/api/charts/${loadedChartId}/`)
      .then(() => {
        // clear loaded state; keep current UI as unsaved working copy
        setLoadedChartId(null);
        setLoadedChartName('');
        setLoadedSnapshot(null);
        setLoadSelectValue('');
        setSearchParams({});
        refreshMyCharts();
      })
      .catch(err => alert(JSON.stringify(err.response?.data || err.message)));
  };

  // share
  const copyShareLink = async () => {
    const id = loadedChartId || searchParams.get('chart') || justSavedId;
    if (!id) return alert('Save the chart first to get a link.');
    const url = `${window.location.origin}${window.location.pathname}?chart=${id}`;
    try { await navigator.clipboard.writeText(url); alert('Link copied!'); }
    catch { alert(url); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', maxWidth:900, margin:'2rem auto', padding:'0 1rem' }}>
      <h1>Build a Custom Emissions Chart</h1>

      {/* Country */}
      <CountrySelector
        countries={countries}
        selected={selectedCountry}
        onChange={code => {
          setRangeStart(''); setRangeEnd(''); setSelectedYear('');
          setSelectedCountry(code);
        }}
      />

      {/* Saved charts management */}
      <div style={{ marginTop:'0.75rem', width:'100%', display:'flex', gap:'0.5rem', alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
        {isAuth && (
          <>
            <label style={{ fontWeight:600 }}>Load saved:</label>

            <select
              value={loadSelectValue}
              onChange={e => {
                const val = e.target.value;
                setLoadSelectValue(val);
                if (val && val !== '__unsaved__') {
                  loadChartById(val);
                }
              }}
            >
              {/* if dirty, show the unsaved label */}
              {loadedChartId && loadSelectValue === '__unsaved__' && (
                <option value="__unsaved__">
                  {(loadedChartName || 'Untitled')} (unsaved)
                </option>
              )}

              <option value="">— Select —</option>

              {myCharts.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={saveChart}
              disabled={
                !selectedCountry || !selectedMetrics.length || !isRangeValid || !tsData.length || saving
              }
              className="save-btn"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button onClick={saveAsChart} disabled={!selectedCountry || !selectedMetrics.length || !isRangeValid || !tsData.length}>
              Save as
            </button>

            <button onClick={renameChart} disabled={!loadedChartId}>Rename</button>
            <button onClick={deleteChart} disabled={!loadedChartId}>Delete</button>
          </>
        )}
        <button onClick={copyShareLink}>Copy link</button>
      </div>

      {/* Metrics */}
      <div style={{ marginTop:'1rem', marginBottom:'1rem', width:'100%', display:'flex', gap:'0.5rem', alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
        <MetricMultiSelect
          indicators={allIndicators}
          value={selectedMetrics}
          onChange={setSelectedMetrics}
        />
      </div>

      {/* Range */}
      {years.length > 0 && (
        <>
          <YearRangeSlider
            min={years[0]}
            max={years[years.length - 1]}
            values={[
              Number.isNaN(startNum) ? years[0] : startNum,
              Number.isNaN(endNum)   ? years[years.length - 1] : endNum
            ]}
            onChange={([s, e]) => {
              setRangeStart(String(s));
              setRangeEnd(String(e));
            }}
          />
          <div style={{ display:'flex', justifyContent:'center', gap:'1rem' }}>
            <div>
              <label>From: </label>
              <input type="number" value={rangeStart} min={years[0]} max={years[years.length-1]} onChange={e=>setRangeStart(e.target.value)} style={{ width:'5rem' }} />
            </div>
            <div>
              <label>To: </label>
              <input type="number" value={rangeEnd} min={years[0]} max={years[years.length-1]} onChange={e=>setRangeEnd(e.target.value)} style={{ width:'5rem' }} />
            </div>
          </div>
          {!isRangeValid && <p style={{ color:'red', textAlign:'center' }}>Start year must be ≤ end year</p>}
        </>
      )}

      {/* Chart */}
      <div style={{ width:'100%', marginTop:'1rem' }}>
        <EmissionsChart data={tsData} unitsMap={unitsMap} seriesKeys={selectedMetrics} />
      </div>

      {/* Save feedback */}
      {justSavedId && !saveError && (
        <p style={{ marginTop:'0.5rem', color:'#2c7', fontWeight:600 }}>
          Saved ✓ (ID {justSavedId})
        </p>
      )}
      {saveError && <p style={{ color:'red' }}>Save failed: {JSON.stringify(saveError)}</p>}
    </div>
  );
}
