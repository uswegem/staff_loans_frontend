import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { apiError } from '../../../api/client';
import { todayEat } from '../../../lib/dates';

/** Starts a draft: asks for the effective date and a note, then opens the editor. */
export default function ChangeDialog({ title, intro, action, onClose, onCreate }) {
  const [effectiveFrom, setEffectiveFrom] = useState(todayEat());
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ effectiveFrom, note });
    } catch (err) {
      const x = apiError(err);
      setError(x.details?.effectiveFrom?.[0] ? `${x.message}` : x.message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>{intro}</p>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Effective from" type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} inputProps={{ min: todayEat() }} helperText="Applications submitted from this date use the new values. Running applications keep theirs." />
          <TextField label="Why this change" multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} helperText="Shown to the checker." />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{action}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
