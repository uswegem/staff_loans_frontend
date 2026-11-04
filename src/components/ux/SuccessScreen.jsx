import { useEffect, useRef } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/material/SvgIcon';
import { useT } from '../../i18n';

/**
 * Presentation only. Callers MUST verify success with the authoritative API
 * before rendering this component. No workflow or transaction state is changed.
 */
export default function SuccessScreen({ title, message, details = [], primaryAction, secondaryAction, focusOnMount = true }) {
  const t = useT();
  const heading = useRef(null);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  return (
    <Card sx={{ maxWidth: 620, mx: 'auto', my: 3, textAlign: 'center' }}>
      <CardContent sx={{ px: { xs: 2, sm: 5 }, py: { xs: 4, sm: 6 } }}>
        <Box aria-hidden="true" sx={{ display: 'flex', justifyContent: 'center', color: 'success.main', mb: 2, '& svg': { width: 64, height: 64 }, '@media (prefers-reduced-motion: no-preference)': { animation: 'slas-success-enter 350ms ease-out both' } }}>
          <CheckCircleOutlineIcon viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 10.2-2.6-2.6L7 13l4 4 6-6-1.4-1.4-4.6 4.6Z" />
          </CheckCircleOutlineIcon>
        </Box>
        <Typography component="h1" variant="h2" ref={heading} tabIndex={-1} sx={{ mb: 1, '&:focus': { outline: 'none' } }}>{title}</Typography>
        {message && <Typography color="text.secondary" sx={{ mb: 3 }}>{message}</Typography>}
        {details.length > 0 && (
          <Box component="dl" sx={{ textAlign: 'left', bgcolor: 'background.default', borderRadius: 2, p: 2, mb: 3, display: 'grid', gap: 1 }}>
            {details.map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography component="dt" color="text.secondary">{label}</Typography>
                <Typography component="dd" sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {primaryAction && <Button variant="contained" onClick={primaryAction.onClick} component={primaryAction.component} to={primaryAction.to}>{primaryAction.label}</Button>}
          {secondaryAction && <Button onClick={secondaryAction.onClick} component={secondaryAction.component} to={secondaryAction.to}>{secondaryAction.label}</Button>}
        </Box>
        {!primaryAction && !secondaryAction && <Typography variant="caption" color="text.secondary">{t('Action completed')}</Typography>}
      </CardContent>
    </Card>
  );
}
