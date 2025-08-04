import React from 'react';

export default function BasisToggle({ viewMode, onChange }) {
  return (
    <div>
      <label>
        <input
          type="radio"
          value="absolute"
          checked={viewMode === 'absolute'}
          onChange={() => onChange('absolute')}
        />{' '}
        Absolute
      </label>
      {' '}
      <label>
        <input
          type="radio"
          value="per_capita"
          checked={viewMode === 'per_capita'}
          onChange={() => onChange('per_capita')}
        />{' '}
        Per Capita
      </label>
    </div>
  );
}
