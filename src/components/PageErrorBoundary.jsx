// A crash on one page shows this message instead of a blank app (D-113 fix). AppShell wraps
// every page with it and resets it when the address changes; the error goes to the console.

import { Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button } from '@mui/material';
import { useT } from '../i18n';

export function PageCrash() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="page">
      <Alert severity="error" role="alert">
        <AlertTitle>{t('Something went wrong on this page.')}</AlertTitle>
        {t('Reload, or go back to your queue.')}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="contained" onClick={() => window.location.reload()}>{t('Reload')}</Button>
          <Button onClick={() => navigate('/queue')}>{t('Go to my queue')}</Button>
        </div>
      </Alert>
    </div>
  );
}

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Page error', error, info?.componentStack);
  }

  render() {
    return this.state.failed ? <PageCrash /> : this.props.children;
  }
}
