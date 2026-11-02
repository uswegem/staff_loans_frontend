import { InputAdornment, TextField } from '@mui/material';
import { groupPhone, phoneDigits, phoneValue } from '../../lib/formats';

// Tanzanian phone number (D-93): a fixed +255 and nine digits, shown as 712 345 678 and
// held as +255712345678. Pasting 0712345678, 255712345678 or +255712345678 works. A
// stored number that is not nine digits is shown as it is, for the person to correct.

export default function PhoneField({ value, onChange, inputProps, ...rest }) {
  const stored = String(value || '');
  const digits = stored.startsWith('+255') ? stored.slice(4).replace(/\D/g, '') : phoneDigits(stored);
  return (
    <TextField
      {...rest}
      type="tel"
      value={digits.length === 9 ? groupPhone(digits) : digits}
      onChange={(e) => onChange(phoneValue(phoneDigits(e.target.value).slice(0, 12)))}
      onPaste={(e) => {
        const text = e.clipboardData?.getData('text');
        if (!text) return;
        e.preventDefault();
        onChange(phoneValue(phoneDigits(text).slice(0, 12)));
      }}
      inputProps={{ inputMode: 'numeric', autoComplete: 'tel-national', className: 'num', ...inputProps }}
      InputProps={{ startAdornment: <InputAdornment position="start">+255</InputAdornment> }}
    />
  );
}
