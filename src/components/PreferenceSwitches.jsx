// Language (English, Kiswahili) and light or dark mode, on the sign-in screen and in the
// header (D-94). The choice is kept for the next visit and the next sign-in.

import { IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { LANGUAGES, usePreferences } from '../i18n';

const Sun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
  </svg>
);
const Moon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
  </svg>
);

export default function PreferenceSwitches({ className }) {
  const { t, language, setLanguage, theme, setTheme } = usePreferences();
  const dark = theme === 'dark';
  const themeLabel = dark ? t('Switch to light mode') : t('Switch to dark mode');
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={language}
        onChange={(_, v) => v && setLanguage(v)}
        aria-label={t('Language')}
        sx={{ '& .MuiToggleButton-root': { px: 1.25, py: 0.25, fontWeight: 700, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', borderColor: 'var(--line)', textTransform: 'none' }, '& .Mui-selected': { bgcolor: 'var(--y) !important', color: '#000 !important' } }}
      >
        {LANGUAGES.map((l) => (
          <ToggleButton key={l.code} value={l.code} lang={l.code} aria-label={l.label} title={l.label}>
            {l.short}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Tooltip title={themeLabel}>
        <IconButton aria-label={themeLabel} aria-pressed={dark} onClick={() => setTheme(dark ? 'light' : 'dark')} size="small">
          {dark ? <Sun /> : <Moon />}
        </IconButton>
      </Tooltip>
    </div>
  );
}
