import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderAt } from '../../test/render';
import SuccessScreen from './SuccessScreen';
import LoadingSkeleton from './LoadingSkeleton';
import StepTransition from './StepTransition';
import AsyncActionButton from './AsyncActionButton';
import ActionFeedback from './ActionFeedback';

describe('shared UX foundation', () => {
  it('renders confirmed outcome details and next action', () => {
    renderAt('/', '/', <SuccessScreen title="Application submitted" message="Forwarded for review" details={[{ label: 'Reference', value: 'SL-001' }]} />);
    expect(screen.getByRole('heading', { name: 'Application submitted' })).toBeInTheDocument();
    expect(screen.getByText('SL-001')).toBeInTheDocument();
  });

  it('focuses the confirmed outcome heading for keyboard and screen-reader users', () => {
    renderAt('/', '/', <SuccessScreen title="Approved" />);
    expect(screen.getByRole('heading', { name: 'Approved' })).toHaveFocus();
  });

  it('provides an actionable next step after a confirmed result', async () => {
    const onClick = vi.fn();
    renderAt('/', '/', <SuccessScreen title="Approved" primaryAction={{ label: 'Continue reviewing', onClick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue reviewing' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render an action when none is supplied', () => {
    renderAt('/', '/', <SuccessScreen title="Recorded" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('exposes loading state to assistive technology', () => {
    renderAt('/', '/', <LoadingSkeleton label="Loading applications" variant="table" rows={2} />);
    expect(screen.getByRole('status', { name: 'Loading applications' })).toHaveAttribute('aria-busy', 'true');
  });

  it('preserves step content', () => {
    renderAt('/', '/', <StepTransition stepKey="details"><input aria-label="Amount" /></StepTransition>);
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeInTheDocument();
  });

  it('shows non-blocking feedback only when open', () => {
    renderAt('/', '/', <ActionFeedback open message="Profile saved" onClose={() => {}} />);
    expect(screen.getByText('Profile saved')).toBeInTheDocument();
  });

  it('keeps error feedback visible until dismissed', () => {
    renderAt('/', '/', <ActionFeedback open severity="error" message="Unable to save" onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save');
  });

  it('prevents clicks while an action is pending', () => {
    renderAt('/', '/', <AsyncActionButton busy busyLabel="Submitting…">Submit</AsyncActionButton>);
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
  });
});
