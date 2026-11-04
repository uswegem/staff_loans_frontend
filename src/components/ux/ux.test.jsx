import { render, screen } from '../../test/render';
import SuccessScreen from './SuccessScreen';
import LoadingSkeleton from './LoadingSkeleton';
import StepTransition from './StepTransition';
import AsyncActionButton from './AsyncActionButton';

describe('shared UX foundation', () => {
  it('renders confirmed outcome details and next action', () => {
    render(<SuccessScreen title="Application submitted" message="Forwarded for review" details={[{ label: 'Reference', value: 'SL-001' }]} />);
    expect(screen.getByRole('heading', { name: 'Application submitted' })).toBeInTheDocument();
    expect(screen.getByText('SL-001')).toBeInTheDocument();
  });

  it('exposes loading state to assistive technology', () => {
    render(<LoadingSkeleton label="Loading applications" variant="table" rows={2} />);
    expect(screen.getByRole('status', { name: 'Loading applications' })).toHaveAttribute('aria-busy', 'true');
  });

  it('preserves step content', () => {
    render(<StepTransition stepKey="details"><input aria-label="Amount" /></StepTransition>);
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeInTheDocument();
  });

  it('prevents clicks while an action is pending', () => {
    render(<AsyncActionButton busy busyLabel="Submitting…">Submit</AsyncActionButton>);
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
  });
});
