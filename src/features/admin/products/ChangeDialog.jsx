import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { apiError } from '../../../api/client';
import { failureShown, useServerErrors } from '../../../lib/validation';
import { todayEat } from '../../../lib/dates';
import { useT } from '../../../i18n';

/** Starts a draft: asks for the effective date and a note, then opens the editor. */
export default function ChangeDialog({ title, intro, action, onClose, onCreate }) {
  const t = useT();
  const [effectiveFrom, setEffectiveFrom] = useState(todayEat());
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const server = useServerErrors(errors, { effectiveFrom, note });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await onCreate({ effectiveFrom, note });
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setFailure(x);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>{intro}</p>
          {failureShown(failure, errors, server) && <Alert severity="error">{failure.message}</Alert>}
          <TextField label={t('Effective from')} type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} inputProps={{ min: todayEat() }} error={!!server('effectiveFrom')} helperText={server('effectiveFrom') || t('Applications submitted from this date use the new values. Running applications keep theirs.')} />
          <TextField label={t('Why this change')} multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} helperText={t('Shown to the checker.')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{action}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
