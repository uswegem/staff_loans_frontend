import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useT } from '../i18n';

// The one "are you sure?" dialog: title, a sentence, Cancel on the left and the action
// on the right. destructive colours the action red for things that cannot be undone.

export default function ConfirmDialog({ title, body, action, onClose, onConfirm, destructive = false, busy = false, children }) {
  const t = useT();
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        {body && <p style={{ margin: 0 }}>{body}</p>}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{t('Cancel')}</Button>
        <Button variant="contained" color={destructive ? 'error' : undefined} onClick={onConfirm} disabled={busy}>{action}</Button>
      </DialogActions>
    </Dialog>
  );
}
