import { TextField } from '@mui/material';
import { nidaInput } from '../../lib/formats';

// NIDA number (D-93): digits only; the hyphens of 19800630-13140-00004-20 are put in
// while the person types or pastes.

export default function NidaField({ value, onChange, inputProps, ...rest }) {
  return (
    <TextField
      {...rest}
      value={value || ''}
      onChange={(e) => onChange(nidaInput(e.target.value))}
      inputProps={{ inputMode: 'numeric', autoComplete: 'off', className: 'num', maxLength: 23, ...inputProps }}
    />
  );
}
