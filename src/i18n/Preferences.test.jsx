// D-94: English and light mode by default; the choice is kept in the browser and on the
// account, and the account's choice applies at the next sign-in.

import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { makeStore } from '../store';
import { sessionStarted } from '../store/authSlice';
import { PreferencesProvider, useT, usePreferences } from '.';
import PreferenceSwitches from '../components/PreferenceSwitches';
import { stubHttp } from '../test/http';

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

function Probe() {
  const t = useT();
  const { theme, language } = usePreferences();
  return (
    <p data-testid="probe" data-theme-mode={theme} data-lang={language}>
      {t('Sign in')} / {t('{n} months', { n: 6 })} / {t('A phrase nobody translated')}
    </p>
  );
}

function setup(store = makeStore()) {
  const ui = render(
    <Provider store={store}>
      <PreferencesProvider>
        <MemoryRouter future={FUTURE}>
          <PreferenceSwitches />
          <Probe />
        </MemoryRouter>
      </PreferencesProvider>
    </Provider>
  );
  return { store, ...ui };
}

const probe = () => screen.getByTestId('probe');

describe('language (D-94)', () => {
  it('is English by default, switches to Swahili, falls back to English for missing text, and is remembered', async () => {
    const first = setup();
    expect(probe()).toHaveTextContent('Sign in / 6 months / A phrase nobody translated');
    expect(document.documentElement.lang).toBe('en');

    await userEvent.click(screen.getByRole('button', { name: 'Kiswahili' }));
    expect(probe()).toHaveTextContent('Ingia / Miezi 6 / A phrase nobody translated');
    expect(document.documentElement.lang).toBe('sw');
    expect(JSON.parse(window.localStorage.getItem('slas.preferences')).language).toBe('sw');

    // After a refresh the choice is still there.
    first.unmount();
    setup();
    expect(probe()).toHaveTextContent('Ingia');
  });

  it('a choice made on the sign-in screen is saved to the account at sign-in', async () => {
    const calls = stubHttp({ 'PATCH /auth/preferences': () => [200, { data: { preferences: { language: 'sw', theme: 'light' } } }] });
    const { store } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Kiswahili' }));
    await act(async () => {
      store.dispatch(sessionStarted({ user: { id: 'u1', fullName: 'Nuru Mfano', preferences: { language: 'en', theme: 'light' } }, roles: [], permissions: [] }));
    });
    const body = JSON.parse(calls.find((c) => c.key === 'PATCH /auth/preferences').config.data);
    expect(body).toEqual({ language: 'sw', theme: 'light' });
    expect(probe()).toHaveTextContent('Ingia');
  });

  it("applies the account's saved language and theme at the next sign-in, and saves changes made while signed in", async () => {
    const calls = stubHttp({ 'PATCH /auth/preferences': () => [200, { data: {} }] });
    const { store } = setup();
    expect(probe()).toHaveAttribute('data-lang', 'en');
    await act(async () => {
      store.dispatch(sessionStarted({ user: { id: 'u2', fullName: 'Amani Mfano', preferences: { language: 'sw', theme: 'dark' } }, roles: [], permissions: [] }));
    });
    expect(probe()).toHaveAttribute('data-lang', 'sw');
    expect(probe()).toHaveAttribute('data-theme-mode', 'dark');
    expect(calls.some((c) => c.key === 'PATCH /auth/preferences')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /auth/preferences').config.data)).toEqual({ language: 'en' });
  });
});

describe('theme (D-94)', () => {
  it('is light by default, ignores the device setting, switches to dark and is remembered', async () => {
    window.matchMedia = (q) => ({ matches: q.includes('dark'), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const first = setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(probe()).toHaveAttribute('data-theme-mode', 'light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(window.localStorage.getItem('slas.preferences')).theme).toBe('dark');

    first.unmount();
    setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    delete window.matchMedia;
  });
});
