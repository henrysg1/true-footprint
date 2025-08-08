import React from 'react';
import Select from 'react-select';

export default function MetricMultiSelect({ indicators, value, onChange }) {
  const options = indicators.map(ind => ({
    value: ind.code,
    label: `${ind.code} — ${ind.name}${ind.unit ? ` (${ind.unit})` : ''}`
  }));

  const selectedOpts = options.filter(o => value.includes(o.value));

  return (
    <div style={{ minWidth: 280, width: '100%', maxWidth: 700 }}>
      <Select
        isMulti
        options={options}
        value={selectedOpts}
        onChange={(opts) => onChange((opts || []).map(o => o.value))}
        placeholder="Select metrics…"
        classNamePrefix="select"
      />
    </div>
  );
}
