import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { referenceApi } from '../../api/reference';
import { useT } from '../../i18n';

// Nationality (D-93): a searchable list of countries from the API; Tanzania by default.

let cache = null;

export default function CountryField({ value, onChange, onBlur, label, required, error, helperText }) {
  const t = useT();
  const [list, setList] = useState(cache?.countries || []);
  useEffect(() => {
    if (cache) return;
    referenceApi
      .countries()
      .then((c) => {
        cache = c;
        setList(c.countries);
      })
      .catch(() => setList([]));
  }, []);
  return (
    <Autocomplete
      options={list}
      value={value || null}
      onChange={(_, v) => onChange(v || '')}
      onBlur={onBlur}
      autoHighlight
      noOptionsText={t('No country matches')}
      renderInput={(params) => <TextField {...params} label={label} required={required} error={error} helperText={helperText} />}
    />
  );
}
