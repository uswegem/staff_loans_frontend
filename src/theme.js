import { createTheme } from '@mui/material/styles';

// MUI themed to the prototype tokens (src/styles/tokens.css) so nothing shows MUI's
// default look (DECISIONS D-13). Keep the two in step: each mode here matches the
// :root (light) and [data-theme="dark"] blocks there (D-94).
const LIGHT = {
  y: '#FFC20E',
  y600: '#E8AE00',
  y200: '#FFE38A',
  black: '#000000',
  strong: '#000000', // text, borders and focus that need the most contrast
  brand100: '#FFF3C4',
  brand050: '#FFFAE8',
  ink: '#1B1B1B',
  ink2: '#4A4A47',
  ink3: '#6B6B66',
  line: '#DDDCD6',
  line2: '#ECEBE6',
  lineHover: '#B7C2CF',
  surface: '#FFFFFF',
  canvas: '#F5F4F0',
  ok: '#2E7D4F',
  okBg: '#E6F3EA',
  okLine: '#B9DCC6',
  warn: '#B4500A',
  warnBg: '#FCEBDD',
  warnLine: '#F1C49F',
  bad: '#B8342A',
  badBg: '#FBE9E7',
  badLine: '#EDC0BB',
  infoBg: '#ECEBE6',
  shadow: '0 8px 28px rgba(0,0,0,.18)',
  font: '"Source Sans 3", "Source Sans Pro", "Segoe UI", system-ui, -apple-system, sans-serif',
};

const DARK = {
  ...LIGHT,
  strong: '#F2F2EE',
  brand100: '#3D3311',
  brand050: '#2A2410',
  ink: '#ECECE8',
  ink2: '#C9C9C3',
  ink3: '#A3A39C',
  line: '#3D3D39',
  line2: '#2C2C29',
  lineHover: '#6B6B66',
  surface: '#1C1C1B',
  canvas: '#121211',
  ok: '#7BCF9C',
  okBg: '#173322',
  okLine: '#2F5C40',
  warn: '#F2A65A',
  warnBg: '#3A2614',
  warnLine: '#6B4523',
  bad: '#F28B82',
  badBg: '#3B1E1B',
  badLine: '#6E3530',
  infoBg: '#2C2C29',
  shadow: '0 8px 28px rgba(0,0,0,.6)',
};

/** Colour tokens for a mode ('light' or 'dark'). */
export const tokensFor = (mode) => (mode === 'dark' ? DARK : LIGHT);

/** Light tokens; kept for code that only ever renders light (printed documents). */
export const T = LIGHT;

export function makeTheme(mode = 'light') {
  const T = tokensFor(mode);
  const focusRing = { outline: `3px solid ${T.strong}`, boxShadow: `0 0 0 6px ${T.y}`, outlineOffset: 2 };
  return createTheme({
    palette: {
      mode,
      primary: { main: T.y, dark: T.y600, light: T.y200, contrastText: '#000' },
      secondary: { main: T.black, contrastText: T.y },
      error: { main: T.bad, light: T.badBg },
      warning: { main: T.warn, light: T.warnBg },
      success: { main: T.ok, light: T.okBg },
      info: { main: T.ink, light: T.infoBg },
      text: { primary: T.ink, secondary: T.ink3 },
      divider: T.line,
      background: { default: T.canvas, paper: T.surface },
    },
    typography: {
      fontFamily: T.font,
      fontSize: 15.5,
      htmlFontSize: 16,
      h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-.01em', color: T.strong, lineHeight: 1.25 },
      h2: { fontSize: 22, fontWeight: 700, color: T.strong, lineHeight: 1.25 },
      h3: { fontSize: 18, fontWeight: 600, color: T.strong, lineHeight: 1.25 },
      h4: { fontSize: 15.5, fontWeight: 600, color: T.strong },
      body1: { fontSize: 15.5, lineHeight: 1.5 },
      body2: { fontSize: 14 },
      caption: { fontSize: 12.5 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: 15.5 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: T.canvas } } },
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiButton: {
        defaultProps: { disableElevation: true, variant: 'outlined', color: 'inherit' },
        styleOverrides: {
          root: { minHeight: 40, padding: '0 18px', borderRadius: 8, whiteSpace: 'nowrap', '&.Mui-focusVisible': focusRing },
          outlined: { borderColor: T.line, background: T.surface, color: T.ink, '&:hover': { borderColor: T.strong, color: T.strong, background: T.surface } },
          containedPrimary: { '&:hover': { background: T.y600 } },
          text: { color: T.strong, textDecoration: 'underline', textUnderlineOffset: 3, padding: '0 10px', '&:hover': { background: T.brand050, textDecoration: 'underline' } },
          sizeSmall: { minHeight: 32, padding: '0 12px', fontSize: 14 },
        },
      },
      MuiIconButton: { styleOverrides: { root: { color: T.ink, '&:hover': { background: T.brand050 }, '&.Mui-focusVisible': focusRing } } },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: 12 }, outlined: { borderColor: T.line } },
      },
      MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 12, borderColor: T.line } } },
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: { root: { position: 'static', transform: 'none', fontSize: 14, fontWeight: 600, color: T.ink2, marginBottom: 6, '&.Mui-focused': { color: T.ink2 }, '&.Mui-error': { color: T.ink2 } }, asterisk: { color: T.bad } },
      },
      MuiTextField: { defaultProps: { fullWidth: true, InputLabelProps: { shrink: true } } },
      MuiOutlinedInput: {
        defaultProps: { notched: false },
        styleOverrides: {
          root: {
            background: T.surface,
            minHeight: 44,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: T.line, top: 0, '& legend': { display: 'none' } },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.lineHover },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.strong, borderWidth: 1 },
            '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(255,194,14,.55)' },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: T.bad },
            '&.Mui-disabled, &.Mui-readOnly': { background: T.canvas },
          },
          input: { padding: '10px 12px', colorScheme: mode },
        },
      },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: 12.5, color: T.ink3, '&.Mui-error': { color: T.bad, fontWeight: 600 } } } },
      MuiCheckbox: { defaultProps: { disableRipple: true }, styleOverrides: { root: { color: T.ink3, '&.Mui-checked': { color: T.strong }, '&.Mui-focusVisible': focusRing } } },
      MuiRadio: { styleOverrides: { root: { color: T.ink3, '&.Mui-checked': { color: T.strong } } } },
      MuiSwitch: { styleOverrides: { switchBase: { '&.Mui-checked': { color: T.y }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: T.y600, opacity: 1 } }, track: { backgroundColor: T.ink3 } } },
      MuiChip: {
        styleOverrides: {
          root: { height: 24, borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: T.infoBg, color: T.ink },
          colorSuccess: { background: T.okBg, color: T.ok },
          colorWarning: { background: T.warnBg, color: T.warn },
          colorError: { background: T.badBg, color: T.bad },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, border: '1px solid', padding: '12px 20px', color: T.ink, alignItems: 'flex-start' },
          standardInfo: { background: T.brand050, borderColor: mode === 'dark' ? '#5C4A12' : T.y200, '& .MuiAlert-icon': { color: mode === 'dark' ? T.y : '#000' } },
          standardWarning: { background: T.warnBg, borderColor: T.warnLine, '& .MuiAlert-icon': { color: T.warn } },
          standardError: { background: T.badBg, borderColor: T.badLine, '& .MuiAlert-icon': { color: T.bad } },
          standardSuccess: { background: T.okBg, borderColor: T.okLine, '& .MuiAlert-icon': { color: T.ok } },
        },
      },
      MuiAlertTitle: { styleOverrides: { root: { fontWeight: 700, marginBottom: 2, color: T.ink } } },
      MuiTableCell: {
        styleOverrides: {
          root: { fontSize: 14, padding: '12px 16px', borderBottom: `1px solid ${T.line2}` },
          head: { fontWeight: 600, color: T.ink3, padding: '10px 16px', borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' },
        },
      },
      MuiTableRow: { styleOverrides: { root: { '&:last-child td': { borderBottom: 0 }, '&.MuiTableRow-hover:hover': { background: T.brand050 } } } },
      MuiTabs: { styleOverrides: { root: { borderBottom: `1px solid ${T.line}`, minHeight: 44 }, indicator: { backgroundColor: T.y, height: 3 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: 15.5, color: T.ink3, minHeight: 44, '&.Mui-selected': { color: T.strong } } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12, boxShadow: T.shadow } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', borderTop: `1px solid ${T.line2}`, background: T.canvas, gap: 12 } } },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${T.line}`, boxShadow: T.shadow } } },
      MuiPopover: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiAutocomplete: { styleOverrides: { paper: { border: `1px solid ${T.line}`, boxShadow: T.shadow }, option: { '&.Mui-focused': { background: `${T.brand050} !important` } } } },
      MuiLink: { styleOverrides: { root: { color: T.ink, textUnderlineOffset: 3 } } },
      MuiSlider: { styleOverrides: { root: { color: T.strong } } },
    },
  });
}

export default makeTheme('light');
