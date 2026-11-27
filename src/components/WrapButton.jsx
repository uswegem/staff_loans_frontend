// An action button whose label may be longer than its container (the decision panel's
// "Recommend approval and send to People and Culture", longer still in Swahili). The theme
// keeps every other button on one line (whiteSpace: nowrap); these wrap and grow in height.

import { Button } from '@mui/material';

export const WRAP_SX = Object.freeze({
  whiteSpace: 'normal',
  height: 'auto',
  minHeight: 44,
  py: 1.25,
  lineHeight: 1.3,
  textAlign: 'center',
  overflowWrap: 'anywhere',
  // In a row next to another button it may shrink below its label's width and wrap.
  minWidth: 0,
  maxWidth: '100%',
});

/** A MUI Button that wraps its label; extra sx is merged after WRAP_SX. */
export default function WrapButton({ sx, ...props }) {
  return <Button {...props} sx={[WRAP_SX, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} />;
}
