// Interface language and theme (D-94). English and light mode are the defaults; the
// choice is kept in this browser (localStorage: interface preferences only, never tokens)
// and, once signed in, on the person's account so it follows them to the next sign-in.
//
// Text is written in English in the code and wrapped in t(): t('Save') or
// t('Hello {name}', { name }). src/i18n/sw.js maps the English text to Swahili; anything
// missing falls back to English. Names, staff numbers, amounts people entered and the
// approved agreement wording are never passed through t().

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { makeTheme } from '../theme';
import { setApiLanguage } from '../api/client';
import { authApi } from '../api/auth';
import SW from './sw';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'sw', label: 'Kiswahili', short: 'SW' },
];
const STORE_KEY = 'slas.preferences';
const DEFAULTS = { language: 'en', theme: 'light' };

function readStored() {
  try {
    const v = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
    return {
      language: v.language === 'sw' ? 'sw' : 'en',
      theme: v.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return { ...DEFAULTS };
  }
}
function writeStored(prefs) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    // Private windows may refuse storage; the account still keeps the choice.
  }
}

let current = 'en';

/** The language in use, for code outside components (dates, status labels). */
export const currentLanguage = () => current;

/** Fills {name} placeholders. */
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m)) : text);

/** text in the current language (or lang), falling back to English. */
export function translate(text, vars, lang = current) {
  if (typeof text !== 'string') return text;
  return fill(lang === 'sw' ? (SW[text] ?? text) : text, vars);
}

const Ctx = createContext({ language: 'en', theme: 'light', t: translate, setLanguage: () => {}, setTheme: () => {} });

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(readStored);
  const auth = useSelector((st) => st.auth);
  const signedIn = auth.status === 'signedIn';
  const userId = auth.user?.id;
  const chosenSignedOut = useRef(false);
  const synced = useRef(null);

  current = prefs.language;
  setApiLanguage(prefs.language);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.documentElement.setAttribute('data-theme', prefs.theme);
    writeStored(prefs);
  }, [prefs]);

  // On sign-in: a choice made on the sign-in screen is saved to the account; otherwise
  // the account's saved choice applies.
  useEffect(() => {
    if (!signedIn || !userId || synced.current === userId) return;
    synced.current = userId;
    if (chosenSignedOut.current) {
      chosenSignedOut.current = false;
      authApi.savePreferences(prefs).catch(() => {});
      return;
    }
    const saved = auth.user?.preferences;
    if (saved) setPrefs({ language: saved.language === 'sw' ? 'sw' : 'en', theme: saved.theme === 'dark' ? 'dark' : 'light' });
  }, [signedIn, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!signedIn) synced.current = null;
  }, [signedIn]);

  const change = useCallback(
    (patch) => {
      setPrefs((p) => ({ ...p, ...patch }));
      if (signedIn) authApi.savePreferences(patch).catch(() => {});
      else chosenSignedOut.current = true;
    },
    [signedIn]
  );

  const value = useMemo(
    () => ({
      language: prefs.language,
      theme: prefs.theme,
      t: (text, vars) => translate(text, vars, prefs.language),
      setLanguage: (language) => change({ language }),
      setTheme: (theme) => change({ theme }),
    }),
    [prefs, change]
  );
  const muiTheme = useMemo(() => makeTheme(prefs.theme), [prefs.theme]);

  return (
    <Ctx.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}

/** { t, language, setLanguage, theme, setTheme } */
export const usePreferences = () => useContext(Ctx);
/** The translate function for the current language. */
export const useT = () => useContext(Ctx).t;
