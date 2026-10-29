// Client-side preview of the segregation-of-duties rules and MFA requirement, using the
// rules the API publishes (GET /permissions). The API re-checks on every save (FR-48).

const MFA_KINDS = ['approve', 'disburse', 'admin', 'check'];

function kindsOf(perms, catalogue) {
  const kinds = new Set();
  perms.forEach((id) => {
    const k = catalogue.permissions.find((p) => p.id === id)?.kind;
    if (k) kinds.add(k);
  });
  return kinds;
}

export function conflictsFor(perms, catalogue) {
  if (!catalogue) return [];
  const set = new Set(perms);
  const kinds = kindsOf(perms, catalogue);
  return catalogue.sodRules.filter((r) => (r.all ? r.all.every((p) => set.has(p)) : r.a.some((k) => kinds.has(k)) && r.b.some((k) => kinds.has(k))));
}

export function needsMfa(perms, catalogue) {
  if (!catalogue) return false;
  const kinds = kindsOf(perms, catalogue);
  return MFA_KINDS.some((k) => kinds.has(k));
}
