import { Fragment } from 'react';

// A label–value list ("Amount  TZS 2,000,000"). rows is [[label, value], …]; rows with an
// empty value (null, undefined, '' or false) are left out rather than shown as "—".

export default function FactList({ rows, className = '' }) {
  const shown = rows.filter((r) => r && r[1] !== null && r[1] !== undefined && r[1] !== '' && r[1] !== false);
  if (!shown.length) return null;
  return (
    <dl className={`facts ${className}`.trim()}>
      {shown.map(([label, value]) => (
        <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>
      ))}
    </dl>
  );
}
