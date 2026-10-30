// Notifications inbox (prototype #/notifications; BRD 12). In-app only: each item
// links to the screen that needs action and is marked read when opened.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@mui/material';
import { notificationsApi } from '../../api/products';
import { apiError } from '../../api/client';
import { formatDateTime } from '../../lib/format';
import { safePath } from '../../lib/safePath';
import styles from './Notifications.module.css';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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
    } catch (e) {
      setError(apiError(e).message);
    }
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Notifications</h1>
          <p>Updates on your applications and items waiting for you. Staff Loans sends notifications in the app only.</p>
        </div>
        <Button onClick={readAll} disabled={!data?.unread}>Mark all read</Button>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <p className="muted" role="status">Loading…</p>}
      {data && (
        <Card>
          {data.items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <h3>No notifications yet</h3>
              <p className="muted">You will see updates here when your applications move.</p>
            </div>
          ) : (
            <ul className={styles.list} aria-label="Notifications">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`${styles.note} ${n.read ? '' : styles.unread}`} onClick={() => open(n)}>
                    <b>{n.text}</b>
                    {!n.read && <span className="visually-hidden"> (unread)</span>}
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
