import { useEffect, useRef, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { formatDay, parseDay } from '../../lib/format';
import { useT } from '../../i18n';

// One date input for the whole app: shows "21 Nov 2026" (Swahili months in Swahili) instead
// of the browser's mm/dd/yyyy, and hands back yyyy-mm-dd as the native input did. Staff can
// type the date (21/11/2026 or 21 Nov 2026) or pick it from the calendar button. onChange
// gets an event-like { target: { name, value } } so existing handlers keep working.

const Calendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export default function DateField({ value, onChange, name, inputProps = {}, error, helperText, disabled, ...rest }) {
  const t = useT();
  const { min, max, ...otherInput } = inputProps;
  const shown = value ? formatDay(value) : '';
  const [text, setText] = useState(shown);
  const [problem, setProblem] = useState(null);
  const picker = useRef(null);

  // A new value from outside (a reset, the picker) replaces what was typed.
  useEffect(() => {
    setText(shown);
    setProblem(null);
  }, [shown]);

  const send = (day) => onChange?.({ target: { name, value: day } });
  const commit = () => {
    if (!text.trim()) {
      setProblem(null);
      if (value) send('');
      return;
    }
    const day = parseDay(text);
    if (!day) return setProblem(t('Enter a date like 21 Nov 2026.'));
    if (min && day < min) return setProblem(t('Choose {date} or later.', { date: formatDay(min) }));
    if (max && day > max) return setProblem(t('Choose {date} or earlier.', { date: formatDay(max) }));
    setProblem(null);
    setText(formatDay(day));
    if (day !== value) send(day);
    return undefined;
  };
  const openPicker = () => {
    const el = picker.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Not allowed (e.g. in tests): fall back to focusing it.
      }
    }
    el.click();
  };

  return (
    <TextField
      {...rest}
      name={name}
      disabled={disabled}
      value={text}
      placeholder={t('e.g. 21 Nov 2026')}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      error={!!problem || error}
      helperText={problem || helperText}
      inputProps={{ ...otherInput, autoComplete: 'off', inputMode: 'text' }}
      InputProps={{
        // Tight right padding so "21 Nov 2026" fits beside the calendar button in narrow columns.
        sx: { pr: 0.5, '& input': { pr: 0 } },
        endAdornment: (
          <InputAdornment position="end" sx={{ ml: 0.5 }}>
            <IconButton size="small" edge="end" aria-label={t('Choose a date')} onClick={openPicker} disabled={disabled}>
              <Calendar />
            </IconButton>
            <input
              ref={picker}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              value={value || ''}
              min={min}
              max={max}
              onChange={(e) => send(e.target.value)}
              style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', border: 0, padding: 0 }}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}
