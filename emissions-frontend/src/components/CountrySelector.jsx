import React from 'react';

export default function CountrySelector({ countries, selected, onChange }) {
  return (
    <label>
      Country:{' '}
      <select value={selected} onChange={e => onChange(e.target.value)}>
        {countries.map(c => (
          <option key={c.iso_code} value={c.iso_code}>
            {c.iso_code} - {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
