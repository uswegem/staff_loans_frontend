import { Alert, Snackbar } from '@mui/material';
import { useT } from '../../i18n';

/**
 * Small, non-blocking feedback for routine actions. Major financial/workflow
 * events should use SuccessScreen only after a confirmed API response.
 * Error messages remain visible until dismissed.
 */
export default function ActionFeedback({ open, message, severity = 'success', onClose, autoHideDuration = 4500 }) {
  const t = useT();
  const persistent = severity === 'error' || severity === 'warning';
  return (
    <Snackbar open={Boolean(open)} autoHideDuration={persistent ? null : autoHideDuration} onClose={persistent ? undefined : onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={severity} onClose={onClose} role={persistent ? 'alert' : 'status'} sx={{ width: '100%', maxWidth: 520 }}>
        {message || t('Action completed')}
      </Alert>
    </Snackbar>
  );
}
