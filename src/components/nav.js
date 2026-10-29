// Side navigation. Each item shows only to users holding one of its permissions
// (the API enforces the same permissions; hiding is a convenience, not the control).
// Items are added here as each milestone ships its screens.

export const NAV = [
  {
    group: 'My loans',
    items: [{ to: '/', label: 'Home', end: true }],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/products', label: 'Products and pricing', any: ['products.view', 'products.make', 'products.check'] },
      { to: '/admin/users', label: 'Users and roles', any: ['admin.users'] },
      { to: '/admin/roles', label: 'Roles and permissions', any: ['admin.roles'] },
    ],
  },
];

export function visibleNav(permissions) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.any || i.any.some((p) => permissions.includes(p))) })).filter((g) => g.items.length);
}
