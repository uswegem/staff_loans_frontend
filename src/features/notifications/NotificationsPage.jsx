// Notifications inbox (prototype #/notifications; BRD 12). In-app only: each item
// links to the screen that needs action and is marked read when opened.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@mui/material';
import { notificationsApi } from '../../api/products';
import { apiError } from '../../api/client';
import { formatDateTime } from '../../lib/format';
import { safePath } from '../../lib/safePath';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import ActionFeedback from '../../components/ux/ActionFeedback';
import styles from './Notifications.module.css';
import { useT } from '../../i18n';

export default function NotificationsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    notificationsApi.list({ limit: 100 }).then(setData).catch((e) => setError(apiError(e).message));
  }, []);

  const open = async (n) => {
    if (!n.read) await notificationsApi.markRead(n.id).catch(() => {});
    if (n.href) navigate(safePath(n.href));
    else setData((d) => ({ ...d, unread: Math.max(0, d.unread - (n.read ? 0 : 1)), items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
  };

  const readAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setData((d) => ({ ...d, unread: 0, items: d.items.map((x) => ({ ...x, read: true })) }));
      setFeedback(t('All notifications marked as read'));
    } catch (e) {
      setError(apiError(e).message);
    }
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Notifications')}</h1>
          <p>{t('Updates on your applications and items waiting for you. Staff Loans sends notifications in the app only.')}</p>
        </div>
        <Button onClick={readAll} disabled={!data?.unread}>{t('Mark all read')}</Button>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <LoadingSkeleton variant="card" label={t('Loading…')} />}
      <ActionFeedback open={Boolean(feedback)} message={feedback} onClose={() => setFeedback(null)} />
      {data && (
        <Card>
          {data.items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <h3>{t('No notifications yet')}</h3>
              <p className="muted">{t('You will see updates here when your applications move.')}</p>
            </div>
          ) : (
            <ul className={styles.list} aria-label={t('Notifications')}>
              {data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`${styles.note} ${n.read ? '' : styles.unread}`} onClick={() => open(n)}>
                    <b>{n.text}</b>
                    {!n.read && <span className="visually-hidden">{' '}{t('(unread)')}</span>}
                    <span className={styles.when}>{formatDateTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
