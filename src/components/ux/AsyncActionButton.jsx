import { Button, CircularProgress } from '@mui/material';
import { useT } from '../../i18n';

/** Visual pending state only; callers still enforce request guards. */
export default function AsyncActionButton({ busy = false, busyLabel, disabled, children, ...props }) {
  const t = useT();
  return (
    <Button {...props} disabled={Boolean(disabled || busy)} aria-busy={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : props.startIcon}>
      {busy ? (busyLabel || t('Processing…')) : children}
    </Button>
  );
}
