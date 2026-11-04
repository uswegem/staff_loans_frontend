import { Box } from '@mui/material';

/**
 * Animates newly mounted step content without holding a second copy of a form.
 * The parent owns all form state. key must identify the current step.
 */
export default function StepTransition({ stepKey, children }) {
  return (
    <Box key={stepKey} className="slas-step-enter">
      {children}
    </Box>
  );
}
