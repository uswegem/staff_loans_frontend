import { Chip } from '@mui/material';

// Maker-checker states (FR-63) with prototype status tones.
export const VERSION_STATES = {
  draft: ['Draft', 'default'],
  pending_approval: ['Pending approval', 'warning'],
  rejected: ['Rejected', 'error'],
  approved_scheduled: ['Approved (scheduled)', 'default'],
  active: ['Active', 'success'],
  inactive: ['Inactive', 'error'],
  superseded: ['Superseded', 'default'],
  discarded: ['Discarded', 'default'],
};

export const PRODUCT_STATUS = {
  active: ['Active', 'success'],
  inactive: ['Inactive', 'error'],
  not_live: ['Not live yet', 'default'],
};

export default function StateChip({ state, map = VERSION_STATES }) {
  const [label, color] = map[state] || [state, 'default'];
  return <Chip size="small" color={color} label={label} />;
}
