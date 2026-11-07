import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../test/render';
import ChangePassword from '../features/auth/ChangePassword';

const field = (label) => screen.getByLabelText(new RegExp(`^${label}`), { selector: 'input' });
const eyeFor = (label) => within(field(label).closest('.MuiInputBase-root')).getByRole('button');

describe('PasswordField on Change password', () => {
  it('hides every password by default and shows an eye button for each', () => {
    renderAt('/change-password', '/change-password', <ChangePassword />);
    for (const label of ['Current password', 'New password', 'Repeat the new password']) {
      expect(field(label)).toHaveAttribute('type', 'password');
      expect(eyeFor(label)).toHaveAccessibleName('Show password');
      expect(eyeFor(label)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('reveals and hides one field at a time without changing what was typed', async () => {
    renderAt('/change-password', '/change-password', <ChangePassword />);
    await userEvent.type(field('New password'), 'Kilimanjaro#2026');

    await userEvent.click(eyeFor('New password'));
    expect(field('New password')).toHaveAttribute('type', 'text');
    expect(field('New password')).toHaveValue('Kilimanjaro#2026');
    expect(eyeFor('New password')).toHaveAccessibleName('Hide password');
    expect(field('Current password')).toHaveAttribute('type', 'password');
    expect(field('Repeat the new password')).toHaveAttribute('type', 'password');

    await userEvent.click(eyeFor('New password'));
    expect(field('New password')).toHaveAttribute('type', 'password');
    expect(field('New password')).toHaveValue('Kilimanjaro#2026');
  });

  it('works from the keyboard', async () => {
    renderAt('/change-password', '/change-password', <ChangePassword />);
    eyeFor('Current password').focus();
    await userEvent.keyboard('{Enter}');
    expect(field('Current password')).toHaveAttribute('type', 'text');
    await userEvent.keyboard(' ');
    expect(field('Current password')).toHaveAttribute('type', 'password');
  });
});
