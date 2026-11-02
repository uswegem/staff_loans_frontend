import { InputAdornment, TextField } from '@mui/material';
import { useT } from '../i18n';

// Money input (prototype component): TZS prefix, thousands separators as you type,
// numeric keyboard, value held as integer shillings (null when empty).

const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '');
const show = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US'));

export default function MoneyInput({ value, onChange, inputProps, ...rest }) {
  const t = useT();
  return (
    <TextField
      {...rest}
      value={show(value)}
      onChange={(e) => {
        const d = digitsOnly(e.target.value).slice(0, 13);
        onChange(d ? Number.parseInt(d, 10) : null);
      }}
      inputProps={{ inputMode: 'numeric', autoComplete: 'off', className: 'num', ...inputProps }}
      InputProps={{ startAdornment: <InputAdornment position="start">{t('TZS')}</InputAdornment> }}
    />
  );
}
