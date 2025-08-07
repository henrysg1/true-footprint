import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

export default function EmissionsChart({
  data,
  unitLabel,
  // default margin if none provided
  margin = { top: 20, right: 30, bottom: 20, left: 60 }
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={margin}            // never undefined now
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="year"
          label={{ value: 'Year', position: 'insideBottomRight', dy: 10 }}
        />

        <YAxis
          label={{
            value: unitLabel,
            angle: -90,
            position: 'insideLeft',
            dx: -10
          }}
        />

        <Tooltip
          formatter={val =>
            val?.toLocaleString(undefined, { maximumFractionDigits: 2 })
          }
        />

        <Legend />

        <Line
          type="monotone"
          dataKey="territorial"
          name="Territorial"
          stroke="#0000FF"
        />

        <Line
          type="monotone"
          dataKey="consumption"
          name="Consumption"
          stroke="#FF0000"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
