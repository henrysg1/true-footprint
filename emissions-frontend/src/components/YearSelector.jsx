export default function YearSelector({ years, selected, onChange }) {
  return (
    <label>
      Year:{' '}
      <select
        value={selected ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
