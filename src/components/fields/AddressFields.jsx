import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { referenceApi } from '../../api/reference';
import { useT } from '../../i18n';

// Region → District → Ward → Street → House/Plot Number (D-93). Region, district and
// ward come from the location list (copied from MMS, served by the API); choosing a
// region loads its districts, choosing a district loads its wards, and changing a
// level clears the levels below it. Street and house or plot number are free text.

export const ADDRESS_PARTS = ['region', 'district', 'ward', 'street', 'house'];

function Pick({ label, options, value, onChange, disabled, required, error, helperText, loading, className }) {
  const t = useT();
  return (
    <Autocomplete
      className={className}
      options={options}
      value={value || null}
      onChange={(_, v) => onChange(v || '')}
      disabled={disabled}
      loading={loading}
      autoHighlight
      noOptionsText={t('Nothing matches')}
      loadingText={t('Loading…')}
      renderInput={(params) => <TextField {...params} label={label} required={required} error={error} helperText={helperText} />}
    />
  );
}

/**
 * value: { region, district, ward, street, house }; onChange(next address).
 * errorOf(part) → message for a part (or undefined).
 */
export default function AddressFields({ value, onChange, errorOf = () => undefined, cellClass }) {
  const t = useT();
  const a = value || {};
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    referenceApi.regions().then(setRegions).catch(() => setRegions([]));
  }, []);
  // Each list is for the region (and district) chosen when it was asked for: an answer that
  // arrives after the choice has changed again is dropped.
  useEffect(() => {
    setDistricts([]);
    if (!a.region) return undefined;
    let current = true;
    setLoading('district');
    referenceApi
      .districts(a.region)
      .then((x) => current && setDistricts(x))
      .catch(() => current && setDistricts([]))
      .finally(() => current && setLoading(''));
    return () => {
      current = false;
    };
  }, [a.region]);
  useEffect(() => {
    setWards([]);
    if (!a.region || !a.district) return undefined;
    let current = true;
    setLoading('ward');
    referenceApi
      .wards(a.region, a.district)
      .then((x) => current && setWards(x))
      .catch(() => current && setWards([]))
      .finally(() => current && setLoading(''));
    return () => {
      current = false;
    };
  }, [a.region, a.district]);

  const set = (part, v) => {
    const next = { ...a, [part]: v };
    // A new parent clears the levels below it.
    if (part === 'region' && v !== a.region) Object.assign(next, { district: '', ward: '' });
    if (part === 'district' && v !== a.district) next.ward = '';
    onChange(next);
  };
  const err = (part) => errorOf(part);

  return (
    <>
      <Pick className={cellClass} label={t('Region')} required options={regions} value={a.region} onChange={(v) => set('region', v)} error={!!err('region')} helperText={err('region')} />
      <Pick
        className={cellClass}
        label={t('District')}
        required
        options={districts}
        value={a.district}
        onChange={(v) => set('district', v)}
        disabled={!a.region}
        loading={loading === 'district'}
        error={!!err('district')}
        helperText={err('district') || (!a.region ? t('Choose the region first.') : undefined)}
      />
      <Pick
        className={cellClass}
        label={t('Ward')}
        required
        options={wards}
        value={a.ward}
        onChange={(v) => set('ward', v)}
        disabled={!a.district}
        loading={loading === 'ward'}
        error={!!err('ward')}
        helperText={err('ward') || (!a.district ? t('Choose the district first.') : undefined)}
      />
      <TextField className={cellClass} label={t('Street')} required value={a.street || ''} onChange={(e) => set('street', e.target.value)} error={!!err('street')} helperText={err('street')} />
      <TextField className={cellClass} label={t('House/Plot Number')} value={a.house || ''} onChange={(e) => set('house', e.target.value)} helperText={t('Optional.')} />
    </>
  );
}
