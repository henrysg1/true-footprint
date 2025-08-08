import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const PALETTE = ['#1f77b4','#ff7f0e','#2ca02c','#d62728',
                 '#9467bd','#8c564b','#e377c2','#7f7f7f',
                 '#bcbd22','#17becf'];

export default function EmissionsChart({
  data,
  seriesKeys = [],              // e.g. ['co2', 'consumption_co2', 'co2_per_capita']
  unitsMap = {},                // e.g. { co2: 'Mt CO₂', co2_per_capita: 't CO₂/person' }
  margin = { top: 20, right: 60, bottom: 20, left: 60 }
}) {
  // Group series by unit
  const unitOf = k => (unitsMap?.[k] ?? '').trim();
  const uniqueUnits = Array.from(new Set(seriesKeys.map(unitOf)));

  const leftUnit  = uniqueUnits[0] || '';
  const rightUnit = uniqueUnits.find(u => u && u !== leftUnit);

  const leftKeys  = seriesKeys.filter(k => unitOf(k) === leftUnit || (!unitOf(k) && !rightUnit));
  const rightKeys = rightUnit ? seriesKeys.filter(k => unitOf(k) === rightUnit) : [];

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year"
               label={{ value: 'Year', position: 'insideBottomRight', dy: 10 }} />
        <YAxis
          yAxisId="left"
          label={{ value: leftUnit || 'Value', angle: -90, position: 'insideLeft', dx: -10 }}
        />
        {rightKeys.length > 0 && (
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: rightUnit, angle: 90, position: 'insideRight', dx: 10 }}
          />
        )}
        <Tooltip />
        <Legend />

        {leftKeys.map((key, i) => (
          <Line
            key={key}
            yAxisId="left"
            type="monotone"
            dataKey={key}
            name={`${key}${unitOf(key) ? ` (${unitOf(key)})` : ''}`}
            stroke={PALETTE[i % PALETTE.length]}
            dot={false}
          />
        ))}

        {rightKeys.map((key, i) => (
          <Line
            key={key}
            yAxisId="right"
            type="monotone"
            dataKey={key}
            name={`${key}${unitOf(key) ? ` (${unitOf(key)})` : ''}`}
            stroke={PALETTE[(i + leftKeys.length) % PALETTE.length]}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
