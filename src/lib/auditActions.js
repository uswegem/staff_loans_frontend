// Plain names for audit actions. The code itself stays in the log, its export and a
// tooltip; screens show these words. Exact codes first, then the family the code is in.

const EXACT = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.token_refresh': 'Session refreshed',
  'auth.locked': 'Account locked',
  'auth.password_changed': 'Password changed',
  'auth.mfa_enrolled': 'One-time codes set up',
  'review.view': 'Application opened for review',
  'review.crb_report': 'Credit bureau report attached',
  'report.export': 'Exported',
  'staff.view': 'Staff record opened',
  'user.create': 'User added',
  'user.password_reset': 'Password reset',
  'user.unlock': 'Account unlocked',
  'settings.update': 'Workflow settings changed',
  'disbursement.confirm': 'Disbursement confirmed',
  'loan.disbursed': 'Marked as disbursed',
  'summary.download': 'Loan summary downloaded',
  'payslip.upload': 'Payslip attached',
  'file.download': 'File downloaded',
  'file.preview': 'File previewed',
  'agreement.download': 'Agreement downloaded',
};

const FAMILY = [
  ['review.', 'Decision recorded'],
  ['security.', 'Security warning'],
  ['auth.', 'Sign-in'],
  ['application.', 'Application changed'],
  ['profile.', 'Profile changed'],
  ['staff.', 'Staff record changed'],
  ['dob.', 'Date of birth check'],
  ['user.', 'User account changed'],
  ['role.', 'Role changed'],
  ['delegation.', 'Delegation changed'],
  ['product.', 'Product changed'],
  ['pricing.', 'Pricing changed'],
  ['template.', 'Agreement template changed'],
  ['holiday.', 'Holiday changed'],
  ['disbursement.', 'Disbursement'],
  ['document.', 'Document changed'],
  ['payslip.', 'Payslip'],
  ['report.', 'Report'],
];

/** The plain English name for an action code; the caller translates it. */
export function actionName(code) {
  if (EXACT[code]) return EXACT[code];
  const family = FAMILY.find(([prefix]) => code.startsWith(prefix));
  return family ? family[1] : code;
}

/**
 * Action types to filter by: [value sent to the API (comma-separated code prefixes), name].
 * Nothing is hidden by default; these only narrow the list when chosen.
 */
export const ACTION_FILTERS = [
  ['auth.login', 'Signed in'],
  ['auth.logout', 'Signed out'],
  ['auth.token_refresh', 'Session refreshed'],
  ['auth.locked,auth.password_changed,auth.mfa_enrolled,security.', 'Security and passwords'],
  ['review.approve,review.return,review.reject', 'Decision recorded'],
  ['review.view,staff.view,file.,agreement.download,summary.download,schedule.download,disbursement.view', 'Viewed or downloaded'],
  ['report.export', 'Exported'],
  ['application.,document.,payslip.', 'Application changed'],
  ['staff.create,staff.update,staff.status,staff.import_commit,dob.,profile.', 'Staff record changed'],
  ['user.,role.,delegation.', 'Users and roles changed'],
  ['product.,pricing.,template.', 'Products and agreements changed'],
  ['settings.,holiday.', 'Workflow settings changed'],
  ['disbursement.confirm,loan.disbursed', 'Disbursement confirmed'],
];
