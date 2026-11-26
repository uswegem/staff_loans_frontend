// "Your work" on Home: what is waiting for this person in each role they hold, with a link
// straight to it. Counts come from the same lists the pages use; the API decides what each
// person may see, so a list they cannot open is simply not counted.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Card, CardContent, Link } from '@mui/material';
import { reviewApi } from '../../api/review';
import { disbursementsApi } from '../../api/disbursements';
import { dobApi } from '../../api/staff';
import { productsApi } from '../../api/products';
import { usersApi } from '../../api/admin';
import { plural } from '../../lib/plural';
import { useT } from '../../i18n';

const has = (permissions, any) => any.some((p) => permissions.includes(p));

/** Each source: who sees it, how to count, and the line it gives. Null or 0 lines are left out. */
const SOURCES = [
  {
    key: 'reviews',
    any: ['review.credit', 'review.pcm', 'review.hr', 'review.ceo'],
    load: async () => (await reviewApi.queue('waiting')).counts,
    line: (t, c) => (c.waiting ? { to: '/queue', text: t(plural(c.waiting, '{n} application waiting for you', '{n} applications waiting for you'), { n: c.waiting }), extra: c.overdue ? t('{n} overdue', { n: c.overdue }) : null } : null),
  },
  {
    key: 'disburse',
    any: ['disb.confirm'],
    load: async () => (await disbursementsApi.list('ready')).counts.ready,
    line: (t, n) => (n ? { to: '/disburse', text: t(plural(n, '{n} loan ready to disburse', '{n} loans ready to disburse'), { n }) } : null),
  },
  {
    key: 'dob',
    any: ['staff.verifyDob'],
    load: async () => (await dobApi.queue('pending')).items.length,
    line: (t, n) => (n ? { to: '/staff/dob-verifications', text: t(plural(n, '{n} date of birth to verify', '{n} dates of birth to verify'), { n }) } : null),
  },
  {
    key: 'products',
    any: ['products.approveCredit', 'products.approveRisk'],
    // canCheck is the API's answer: only changes this person may approve at their stage.
    load: async () => {
      const [rows, pricing] = await Promise.all([productsApi.adminList(), productsApi.pricing()]);
      return rows.filter((r) => r.openChange?.canCheck).length + (pricing?.openChange?.canCheck ? 1 : 0);
    },
    line: (t, n) => (n ? { to: '/admin/products', text: t(plural(n, '{n} product change waiting for your approval', '{n} product changes waiting for your approval'), { n }) } : null),
  },
  {
    key: 'locked',
    any: ['admin.users'],
    load: async () => (await usersApi.list({ status: 'locked', limit: 1 })).total,
    line: (t, n) => (n ? { to: '/admin/users?status=locked', text: t(plural(n, '{n} account locked', '{n} accounts locked'), { n }) } : null),
  },
];

export default function YourWork() {
  const t = useT();
  const permissions = useSelector((st) => st.auth.permissions);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let live = true;
    const mine = SOURCES.filter((src) => has(permissions, src.any));
    Promise.all(mine.map((src) => src.load().then((v) => src.line(t, v)).catch(() => null))).then((out) => {
      if (live) setLines(out.filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [permissions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lines.length) return null;
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 8 }}>{t('Your work')}</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {lines.map((l) => (
            <li key={l.to} style={{ padding: '8px 0', borderTop: '1px solid var(--line-2)' }}>
              <Link component={RouterLink} to={l.to} sx={{ fontWeight: 600 }}>{l.text}</Link>
              {l.extra && <span style={{ color: 'var(--bad)', fontWeight: 600 }}>, {l.extra}</span>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
