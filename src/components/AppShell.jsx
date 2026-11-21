import { Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import AccountMenu from './AccountMenu';
import PreferenceSwitches from './PreferenceSwitches';
import NotificationBell from './NotificationBell';
import useSessionKeeper from '../lib/useSessionKeeper';
import SessionTimeoutDialog from './SessionTimeoutDialog';
import ActionFeedback from './ux/ActionFeedback';
import LoadingSkeleton from './ux/LoadingSkeleton';
import { visibleNav } from './nav';
import logo from '../assets/lfb-logo.png';
import s from './AppShell.module.css';
import { usePreferences } from '../i18n';

export default function AppShell() {
  const { t, language } = usePreferences();
  const permissions = useSelector((st) => st.auth.permissions);
  // Until a temporary password is changed there is nowhere else to go, so no menu.
  const mustChange = useSelector((st) => !!st.auth.user?.mustChangePassword);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const idle = useSessionKeeper();

  useEffect(() => setOpen(false), [location.pathname]);
  // A page can hand over a short confirmation as it navigates: navigate(to, { state: { toast } }).
  const toast = location.state?.toast;
  const clearToast = () => navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });

  return (
    <>
      <a href="#main" className="visually-hidden">{t('Skip to content')}</a>
      <header className={s.topbar}>
        {!mustChange && <IconButton className={s.menuToggle} aria-label={open ? t('Close menu') : t('Open menu')} aria-expanded={open} aria-controls="sidenav" onClick={() => setOpen((v) => !v)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </IconButton>}
        <img className={s.logo} src={logo} alt="Letshego Faidika Bank" />
        <span className={s.appname}>{t('Staff Loans')}</span>
        <span className={s.spacer} />
        <PreferenceSwitches className={s.prefs} />
        <NotificationBell />
        <AccountMenu />
      </header>
      <div className={`${s.layout} ${mustChange ? s.noNav : ''}`}>
        {!mustChange && <nav id="sidenav" className={`${s.nav} ${open ? s.navOpen : ''}`} aria-label={t('Main')}>
          {visibleNav(permissions).map((g) => (
            <div key={g.group} className={g.items.length > 1 ? undefined : s.single}>
              {/* A heading over a single link only repeats it. */}
              {g.items.length > 1 && <div className={s.group}>{t(g.group)}</div>}
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? s.active : undefined)}>
                  {t(i.label)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>}
        <main id="main" className={s.main} tabIndex={-1}>
          {/* A new language re-opens the page, so messages from the API come back in it too. */}
          <div key={language} style={{ display: 'contents' }}>
            {/* Pages split out of the main bundle (App.jsx) show a placeholder while they load. */}
            <Suspense fallback={<div className="page"><LoadingSkeleton label={t('Loading…')} /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      {/* Over the page, not instead of it: unsaved form input stays until the session really ends. */}
      <ActionFeedback open={!!toast} message={toast ? t(toast) : ''} onClose={clearToast} />
      <SessionTimeoutDialog remaining={idle.remaining} onStay={idle.staySignedIn} onLogOut={idle.logOutNow} />
    </>
  );
}
