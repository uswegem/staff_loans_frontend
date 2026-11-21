import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import NotificationsPage from './NotificationsPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

describe('Notifications', () => {
  it('marks unread items with a dot and bold text, and says "(unread)" to screen readers only', async () => {
    stubHttp({
      'GET /notifications': () => [200, { data: { unread: 1, items: [
        { id: 'n1', text: 'Your application was approved.', read: false, createdAt: '2026-11-21T08:00:00Z' },
        { id: 'n2', text: 'Your date of birth was verified.', read: true, createdAt: '2026-11-20T08:00:00Z' },
      ] } }],
    });
    renderAt('/notifications', '/notifications', <NotificationsPage />);
    const unread = (await screen.findByText('Your application was approved.', { exact: false })).closest('button');
    expect(unread).toHaveTextContent('Your application was approved. (unread)');
    expect(unread.querySelector('.unread-dot')).not.toBeNull();
    expect(unread.querySelector('.visually-hidden')).toHaveTextContent('(unread)');
    const read = screen.getByText('Your date of birth was verified.', { exact: false }).closest('button');
    expect(read.querySelector('.unread-dot')).toBeNull();
    expect(read).not.toHaveTextContent('(unread)');
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeEnabled();
  });
});
