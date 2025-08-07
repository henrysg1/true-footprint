// src/components/YearRangeSlider.jsx
import React from 'react';
import { Range, getTrackBackground } from 'react-range';

export default function YearRangeSlider({
  min,
  max,
  step = 1,
  values = [min, max],       // ensure a default two-thumb range
  onChange                  // fn receives [newStart, newEnd]
}) {
  // make the slider span the full width of its container
  const SLIDER_WIDTH = '100%';

  return (
    <div style={{ width: SLIDER_WIDTH, padding: '0 1rem', margin: '1rem 0' }}>
      <Range
        values={values}
        step={step}
        min={min}
        max={max}
        onChange={onChange}
        renderTrack={({ props, children }) => (
          // outer div handles user input
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            style={{
              ...props.style,
              height: '6px',
              display: 'flex',
              width: SLIDER_WIDTH
            }}
          >
            {/* inner div is the colored track */}
            <div
              ref={props.ref}
              style={{
                height: '6px',
                width: '100%',
                borderRadius: '3px',
                background: getTrackBackground({
                  values,
                  colors: ['#ccc', '#0384fc', '#ccc'],
                  min,
                  max
                })
              }}
            >
              {children /* the thumbs go here */}
            </div>
          </div>
        )}
        renderThumb={({ props, index }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '16px',
              width: '16px',
              borderRadius: '50%',
              backgroundColor: '#0384fc',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 0 2px rgba(0,0,0,0.5)'
            }}
          >
            {/* show the year above each thumb */}
            <div style={{ position: 'absolute', top: '-28px', color: '#333', fontSize: '0.75rem' }}>
              {values[index]}
            </div>
          </div>
        )}
      />
    </div>
  );
}
