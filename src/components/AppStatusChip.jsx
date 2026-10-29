import { Chip } from '@mui/material';
import { STATUS } from '../lib/statuses';

export default function AppStatusChip({ status }) {
  const [label, tone] = STATUS[status] || [status, 'default'];
  return <Chip size="small" color={tone === 'info' ? 'default' : tone} label={label} sx={tone === 'info' ? { background: 'var(--info-bg)' } : undefined} />;
}
