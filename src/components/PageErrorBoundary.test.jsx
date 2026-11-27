import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageErrorBoundary from './PageErrorBoundary';
import { renderAt } from '../test/render';

function Broken() {
  throw new Error('boom');
}

// A crash on one page shows a message with a way out, never a blank app.
describe('page error boundary', () => {
  it('shows the fallback with Reload and Go to my queue, and logs the error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/x', '/x', <PageErrorBoundary><Broken /></PageErrorBoundary>);
    expect(screen.getByText('Something went wrong on this page.')).toBeInTheDocument();
    expect(screen.getByText('Reload, or go back to your queue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to my queue' })).toBeInTheDocument();
    expect(log.mock.calls.some(([first]) => first === 'Page error')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Go to my queue' }));
    log.mockRestore();
  });

  it('renders the page when nothing throws', () => {
    renderAt('/x', '/x', <PageErrorBoundary><p>Fine</p></PageErrorBoundary>);
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});
