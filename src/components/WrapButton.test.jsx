import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WrapButton, { WRAP_SX } from './WrapButton';

// The label may wrap (the theme keeps other buttons on one line); extra sx still applies.
describe('WrapButton', () => {
  it('lets a long label wrap and the button grow', () => {
    render(<WrapButton variant="contained" fullWidth sx={{ mt: 2 }}>Recommend approval and send to People and Culture</WrapButton>);
    const button = screen.getByRole('button', { name: 'Recommend approval and send to People and Culture' });
    const style = window.getComputedStyle(button);
    expect(style.whiteSpace).toBe('normal');
    expect(style.height).toBe('auto');
    expect(style.minHeight).toBe('44px');
    expect(style.marginTop).toBe('16px');
    expect(WRAP_SX).toMatchObject({ whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' });
  });
});
