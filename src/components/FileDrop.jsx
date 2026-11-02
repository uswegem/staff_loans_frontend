// A drag-and-drop box with a file picker beside it (§1b, §3c). The API still checks the
// type and size of every file; `accept` here only guides the picker and the drop.

import { useRef, useState } from 'react';
import { Button } from '@mui/material';
import s from './FileDrop.module.css';

/**
 * accept: e.g. '.pdf'; label: what to drop; hint: helper text under the box;
 * onFile(file): called with the chosen or dropped file; busy: shows "Reading…".
 */
export default function FileDrop({ accept, label, hint, buttonLabel = 'Choose file', onFile, busy = false, error, inputLabel }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const exts = (accept || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const allowed = (file) => !exts.length || exts.some((e) => file.name.toLowerCase().endsWith(e));

  const take = (file, setError) => {
    if (!file) return;
    if (!allowed(file)) {
      setError?.(`Only ${exts.join(', ').toUpperCase()} files.`);
      return;
    }
    onFile(file);
  };
  const [localError, setLocalError] = useState(null);

  return (
    <div>
      <div
        className={`${s.drop} ${over ? s.over : ''} ${error || localError ? s.bad : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          setLocalError(null);
          take(e.dataTransfer.files?.[0], setLocalError);
        }}
        role="group"
        aria-label={label}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <div className="small">
          {busy ? 'Reading…' : <>Drag and drop {label.toLowerCase()} here, or</>}
        </div>
        <Button size="small" variant="outlined" disabled={busy} onClick={() => input.current?.click()}>
          {buttonLabel}
        </Button>
        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          aria-label={inputLabel || label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            setLocalError(null);
            take(file, setLocalError);
          }}
        />
      </div>
      {(localError || hint) && (
        <div className="xs" style={{ marginTop: 6, color: localError ? 'var(--bad)' : 'var(--ink-3)', fontWeight: localError ? 600 : 400 }} role={localError ? 'alert' : undefined}>
          {localError || hint}
        </div>
      )}
    </div>
  );
}
