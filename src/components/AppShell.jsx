import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { IconButton } from '@mui/material';
import AccountMenu from './AccountMenu';
import useSessionKeeper from '../lib/useSessionKeeper';
import { visibleNav } from './nav';
import logo from '../assets/lfb-logo.png';
import s from './AppShell.module.css';

export default function AppShell() {
  const permissions = useSelector((st) => st.auth.permissions);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useSessionKeeper();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <a href="#main" className="visually-hidden">Skip to content</a>
      <header className={s.topbar}>
        <IconButton className={s.menuToggle} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="sidenav" onClick={() => setOpen((v) => !v)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </IconButton>
        <img className={s.logo} src={logo} alt="Letshego Faidika Bank" />
        <span className={s.appname}>Staff Loans</span>
        <span className={s.spacer} />
        <AccountMenu />
      </header>
      <div className={s.layout}>
        <nav id="sidenav" className={`${s.nav} ${open ? s.navOpen : ''}`} aria-label="Main">
          {visibleNav(permissions).map((g) => (
            <div key={g.group}>
              <div className={s.group}>{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? s.active : undefined)}>
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <main id="main" className={s.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
