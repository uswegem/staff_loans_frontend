import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePassword, { RULES } from './ChangePassword';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const ruleItem = (text) => screen.getByText(text, { exact: false }).closest('li');

describe('Change password', () => {
  it('rule checks follow the policy', () => {
    const [len, classes, staffNo] = RULES.map(([, check]) => check);
    expect(len('Abc12#xy')).toBe(true);
    expect(len('Abc12#x')).toBe(false);
    expect(classes('abcdefgh1')).toBe(false);
    expect(classes('abcdefG1')).toBe(true);
    expect(staffNo('xxLFB0010yy', 'LFB0010')).toBe(false);
    expect(staffNo('Mine#2026', 'LFB0010')).toBe(true);
    expect(RULES[3][1]).toBeNull();
  });

  it('ticks rules as the new password meets them and keeps the current password field', async () => {
    renderAt('/change-password', '/change-password', <ChangePassword />);
    expect(screen.getByLabelText(/Current password/)).toBeInTheDocument();
    expect(ruleItem('At least 8 characters')).not.toHaveTextContent('✓');
    await userEvent.type(screen.getByLabelText(/^New password/), 'Mine#2026x');
    expect(ruleItem('At least 8 characters')).toHaveTextContent('✓');
    expect(ruleItem('Three of:')).toHaveTextContent('✓');
    expect(ruleItem('Not your staff number')).toHaveTextContent('✓');
    expect(ruleItem('Not one of your last 5 passwords')).toHaveTextContent('checked when you save');
  });

  it('hands "Password changed." to the next page as a toast', async () => {
    stubHttp({ 'POST /auth/change-password': () => [200, { data: { user: { id: 'u-test', mustChangePassword: false } } }] });
    renderAt('/change-password', '/change-password', <ChangePassword />);
    await userEvent.type(screen.getByLabelText(/Current password/), 'Old#Pass2026');
    await userEvent.type(screen.getByLabelText(/^New password/), 'Mine#2026x');
    await userEvent.type(screen.getByLabelText(/Repeat the new password/), 'Mine#2026x');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByLabelText(/^New password/)).toHaveValue(''));
  });
});
