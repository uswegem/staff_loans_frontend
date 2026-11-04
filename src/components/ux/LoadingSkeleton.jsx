import { Box, Skeleton, Stack } from '@mui/material';

/** Layout-stable placeholders; callers choose the matching page shape. */
export default function LoadingSkeleton({ variant = 'page', rows = 4, label = 'Loading…' }) {
  const count = Math.max(1, Math.min(20, rows));
  return (
    <Box role="status" aria-label={label} aria-busy="true" sx={{ width: '100%' }}>
      {variant === 'table' ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rectangular" height={44} />
          {Array.from({ length: count }, (_, i) => <Skeleton key={i} variant="rectangular" height={48} />)}
        </Stack>
      ) : variant === 'card' ? (
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="55%" height={32} />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="75%" />
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Skeleton variant="text" width="45%" height={44} />
          <Skeleton variant="text" width="70%" />
          {Array.from({ length: count }, (_, i) => <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 1 }} />)}
        </Stack>
      )}
    </Box>
  );
}
