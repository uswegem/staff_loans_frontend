// Side navigation. Each item shows only to users holding one of its permissions
// (the API enforces the same permissions; hiding is a convenience, not the control).
// Group and item labels are English; the shell shows them in the chosen language.

export const NAV = [
  {
    group: 'My loans',
    items: [
      { to: '/', label: 'Home', end: true },
      { to: '/apply', label: 'Apply for a loan', any: ['loan.apply'] },
      { to: '/applications', label: 'My applications', any: ['loan.viewOwn'] },
      { to: '/profile', label: 'My profile', any: ['loan.apply'] },
    ],
  },
  {
    group: 'Reviews',
    items: [
      { to: '/queue', label: 'Review queue', any: ['review.credit', 'review.pcm', 'review.hr', 'review.ceo'] },
      { to: '/delegation', label: 'My delegation', any: ['review.delegate'] },
    ],
  },
  {
    group: 'Operations',
    items: [{ to: '/disburse', label: 'Disbursements', any: ['disb.confirm'] }],
  },
  {
    group: 'Reports',
    items: [{ to: '/reports', label: 'Reports', any: ['reports.view', 'admin.users', 'admin.roles', 'audit.view'] }],
  },
  {
    group: 'People and Culture',
    items: [
      { to: '/staff', label: 'Staff records', any: ['staff.view', 'staff.manage'] },
      { to: '/staff/dob-verifications', label: 'Date of birth checks', any: ['staff.verifyDob'] },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/products', label: 'Products and pricing', any: ['products.view', 'products.make', 'products.approveCredit', 'products.approveRisk'] },
      { to: '/admin/users', label: 'Users and roles', any: ['admin.users'] },
      { to: '/admin/roles', label: 'Roles and permissions', any: ['admin.roles'] },
      { to: '/admin/workflow', label: 'Workflow and calendar', any: ['admin.workflow'] },
      { to: '/admin/templates', label: 'Agreement templates', any: ['admin.templates', 'templates.approve'] },
      { to: '/admin/audit', label: 'Audit log', any: ['audit.view'] },
    ],
  },
];

export function visibleNav(permissions) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.any || i.any.some((p) => permissions.includes(p))) })).filter((g) => g.items.length);
}
