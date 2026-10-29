// Bell and inbox (BRD 12: in-app only). Polls the unread count; each item links to
// the screen that needs action. The full inbox screen arrives with milestone 6.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Divider, IconButton, Menu, MenuItem } from '@mui/material';
import { notificationsApi } from '../api/products';
import { formatDateTime } from '../lib/format';

const POLL_MS = 60 * 1000;

export default function NotificationBell() {
  const [anchor, setAnchor] = useState(null);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const refreshCount = useCallback(() => {
    notificationsApi.unreadCount().then((d) => setUnread(d.unread)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  const open = async (e) => {
    setAnchor(e.currentTarget);
    const d = await notificationsApi.list({ limit: 10 });
    setItems(d.items);
    setUnread(d.unread);
  };

  const go = async (n) => {
    setAnchor(null);
    if (!n.read) await notificationsApi.markRead(n.id).catch(() => {});
    refreshCount();
    if (n.href) navigate(n.href);
  };

  const readAll = async () => {
    await notificationsApi.markAllRead();
    setItems((xs) => xs.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <>
      <IconButton aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-haspopup="menu" onClick={open}>
        <Badge badgeContent={unread} color="error" max={99}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 380, maxWidth: 'calc(100vw - 32px)' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 8px' }}>
          <b>Notifications</b>
          <Button variant="text" size="small" onClick={readAll} disabled={!unread}>Mark all as read</Button>
        </div>
        <Divider />
        {items.length === 0 && <MenuItem disabled>Nothing new.</MenuItem>}
        {items.map((n) => (
          <MenuItem key={n.id} onClick={() => go(n)} sx={{ whiteSpace: 'normal', alignItems: 'flex-start', display: 'block', background: n.read ? undefined : 'var(--brand-050)', py: 1.25 }}>
            <div className="small" style={{ fontWeight: n.read ? 400 : 600 }}>{n.text}</div>
            <div className="xs muted">{formatDateTime(n.createdAt)}</div>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
