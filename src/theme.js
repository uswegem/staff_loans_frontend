import { createTheme } from '@mui/material/styles';

// MUI themed to the prototype tokens (src/styles/tokens.css) so nothing shows MUI's
// default look (DECISIONS D-13). Keep the two in step.
export const T = {
  y: '#FFC20E',
  y600: '#E8AE00',
  y200: '#FFE38A',
  black: '#000000',
  brand100: '#FFF3C4',
  brand050: '#FFFAE8',
  ink: '#1B1B1B',
  ink2: '#4A4A47',
  ink3: '#6B6B66',
  line: '#DDDCD6',
  line2: '#ECEBE6',
  surface: '#FFFFFF',
  canvas: '#F5F4F0',
  ok: '#2E7D4F',
  okBg: '#E6F3EA',
  warn: '#B4500A',
  warnBg: '#FCEBDD',
  bad: '#B8342A',
  badBg: '#FBE9E7',
  infoBg: '#ECEBE6',
  font: '"Source Sans 3", "Source Sans Pro", "Segoe UI", system-ui, -apple-system, sans-serif',
};

const focusRing = { outline: '3px solid #000', boxShadow: `0 0 0 6px ${T.y}`, outlineOffset: 2 };

const theme = createTheme({
  palette: {
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
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-.01em', color: T.black, lineHeight: 1.25 },
    h2: { fontSize: 22, fontWeight: 700, color: T.black, lineHeight: 1.25 },
    h3: { fontSize: 18, fontWeight: 600, color: T.black, lineHeight: 1.25 },
    h4: { fontSize: 15.5, fontWeight: 600, color: T.black },
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
        outlined: { borderColor: T.line, background: T.surface, color: T.ink, '&:hover': { borderColor: '#000', color: '#000', background: T.surface } },
        containedPrimary: { '&:hover': { background: T.y600 } },
        text: { color: '#000', textDecoration: 'underline', textUnderlineOffset: 3, padding: '0 10px', '&:hover': { background: T.brand050, textDecoration: 'underline' } },
        sizeSmall: { minHeight: 32, padding: '0 12px', fontSize: 14 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { '&:hover': { background: T.brand050 }, '&.Mui-focusVisible': focusRing } } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { rounded: { borderRadius: 12 }, outlined: { borderColor: T.line } },
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
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B7C2CF' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000', borderWidth: 1 },
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(255,194,14,.55)' },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: T.bad },
          '&.Mui-disabled, &.Mui-readOnly': { background: T.canvas },
        },
        input: { padding: '10px 12px' },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: 12.5, color: T.ink3, '&.Mui-error': { color: T.bad, fontWeight: 600 } } } },
    MuiCheckbox: { defaultProps: { disableRipple: true }, styleOverrides: { root: { color: T.ink3, '&.Mui-checked': { color: '#000' }, '&.Mui-focusVisible': focusRing } } },
    MuiRadio: { styleOverrides: { root: { '&.Mui-checked': { color: '#000' } } } },
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
        standardInfo: { background: T.brand050, borderColor: T.y200, '& .MuiAlert-icon': { color: '#000' } },
        standardWarning: { background: T.warnBg, borderColor: '#F1C49F', '& .MuiAlert-icon': { color: T.warn } },
        standardError: { background: T.badBg, borderColor: '#EDC0BB', '& .MuiAlert-icon': { color: T.bad } },
        standardSuccess: { background: T.okBg, borderColor: '#B9DCC6', '& .MuiAlert-icon': { color: T.ok } },
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
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: 15.5, color: T.ink3, minHeight: 44, '&.Mui-selected': { color: '#000' } } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,.18)' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', borderTop: `1px solid ${T.line2}`, background: T.canvas, gap: 12 } } },
    MuiMenu: { styleOverrides: { paper: { border: `1px solid ${T.line}`, boxShadow: '0 8px 28px rgba(0,0,0,.18)' } } },
    MuiLink: { styleOverrides: { root: { color: T.ink, textUnderlineOffset: 3 } } },
  },
});

export default theme;
