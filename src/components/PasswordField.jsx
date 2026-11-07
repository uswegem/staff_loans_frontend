// A password TextField with an eye button to show or hide what was typed. Each field keeps
// its own visibility; toggling changes only the input type, never the value. Works with
// react-hook-form's register (the ref is passed to the input) and with controlled values.

import { forwardRef, useState } from 'react';
import { IconButton, InputAdornment, SvgIcon, TextField } from '@mui/material';
import { useT } from '../i18n';

const Eye = (props) => (
  <SvgIcon {...props}>
    <path d="M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
  </SvgIcon>
);

const EyeOff = (props) => (
  <SvgIcon {...props}>
    <path d="M2.3 3.7 3.7 2.3l18 18-1.4 1.4-3.2-3.2A11.6 11.6 0 0 1 12 19C6.5 19 2.7 14.9 1.5 12a13 13 0 0 1 4-5L2.3 3.7Zm5.2 5.2A4.5 4.5 0 0 0 15 15.1l-1.5-1.5a2.5 2.5 0 0 1-3.1-3.1L7.5 8.9ZM12 5c5.5 0 9.3 4.1 10.5 7a12.9 12.9 0 0 1-3.2 4.4l-2.9-2.9A4.5 4.5 0 0 0 10.5 7.7L8.6 5.6C9.6 5.2 10.8 5 12 5Z" />
  </SvgIcon>
);

const PasswordField = forwardRef(function PasswordField({ InputProps, inputRef, ...props }, ref) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      inputRef={ref || inputRef}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              onClick={() => setShow((v) => !v)}
              onMouseDown={(e) => e.preventDefault()}
              aria-label={show ? t('Hide password') : t('Show password')}
              aria-pressed={show}
              title={show ? t('Hide password') : t('Show password')}
            >
              {show ? <EyeOff fontSize="small" /> : <Eye fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
});

export default PasswordField;
