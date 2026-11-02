import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, AlertTitle } from '@mui/material';
import { useT } from '../i18n';

/** Routes for signed-in users. A temporary password must be changed first. */
export function RequireAuth() {
  const t = useT();
  const { status, user } = useSelector((st) => st.auth);
  const location = useLocation();
  if (status === 'checking') return <p className="muted" style={{ padding: 32 }} role="status">{t('Loading Staff Loans…')}</p>;
  if (status !== 'signedIn') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

/** Hides a screen from users without the permission. The API enforces it as well. */
export function RequirePermission({ any, children }) {
  const t = useT();
  const permissions = useSelector((st) => st.auth.permissions);
  if (!any.some((p) => permissions.includes(p))) {
    return (
      <div className="page">
        <Alert severity="warning">
          <AlertTitle>{t('You do not have access to this page')}</AlertTitle>
          {t('Ask a System Administrator if you need it for your work.')}
        </Alert>
      </div>
    );
  }
  return children;
}
