// Ported from Ess-Frontend/src/components/topbar/UserProfileMenu.jsx: the account
// menu behaviour (open, items, sign out). Tenant switcher removed; prototype
// styling; adds "My roles and permissions" (FR-52) and Change password.

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Divider, ListItemText, Menu, MenuItem } from '@mui/material';
import { authApi } from '../api/auth';
import { sessionEnded } from '../store/authSlice';
import s from './AppShell.module.css';
import { useT } from '../i18n';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function AccountMenu() {
  const t = useT();
  const [anchor, setAnchor] = useState(null);
  const user = useSelector((st) => st.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // The job title from the HR record, never a system role: roles are listed under My roles
  // and permissions, and one person may hold several.
  const subtitle = user.title || user.staffNo;

  const go = (path) => {
    setAnchor(null);
    navigate(path);
  };
  const signOut = async () => {
    setAnchor(null);
    try {
      await authApi.logout();
    } finally {
      dispatch(sessionEnded(null));
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <button type="button" className={s.who} aria-haspopup="menu" aria-expanded={!!anchor} aria-label={t('Account menu for {name}', { name: user.fullName })} onClick={(e) => setAnchor(e.currentTarget)}>
        <span className={s.avatar} aria-hidden="true">{initials(user.fullName)}</span>
        <span className={s.meta}>
          <b>{user.fullName}</b>
          <span>{subtitle}</span>
        </span>
      </button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <ListItemText primary={user.fullName} secondary={`${user.staffNo}${user.title ? `, ${user.title}` : ''}`} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => go('/account/access')}>{t('My roles and permissions')}</MenuItem>
        <MenuItem onClick={() => go('/change-password')}>{t('Change password')}</MenuItem>
        <Divider />
        <MenuItem onClick={signOut}>{t('Sign out')}</MenuItem>
      </Menu>
    </>
  );
}
