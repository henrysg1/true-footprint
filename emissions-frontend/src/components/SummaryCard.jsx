import React from 'react';

export default function SummaryCard({ territorial, consumption, viewMode }) {
  const unit = viewMode === 'absolute'
    ? 'Mt CO₂'
    : 't CO₂ per person';

  const fmt = val =>
    val?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '-';

  return (
    <div /* styling */>
      <h2>Summary ({unit})</h2>
      <p>Territorial: {fmt(territorial)}</p>
      <p>Consumption: {fmt(consumption)}</p>
    </div>
  );
}
