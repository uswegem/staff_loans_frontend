// FR-52: each user sees the roles and permissions they hold.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { api } from '../../api/client';
import { formatDate } from '../../lib/format';
import { useT } from '../../i18n';

const GROUP_ORDER = ['My loans', 'Reviews', 'Operations', 'Staff records', 'Reports', 'Administration'];

export default function MyAccess() {
  const t = useT();
  const { roles, permissions, mfaRequired } = useSelector((st) => st.auth);
  const [catalogue, setCatalogue] = useState(null);

  useEffect(() => {
    api.get('/permissions').then((r) => setCatalogue(r.data.data.permissions)).catch(() => setCatalogue([]));
  }, []);

  const labelOf = (id) => catalogue?.find((p) => p.id === id);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('My roles and permissions')}</h1>
          <p>{t('What you can do in Staff Loans. Ask a System Administrator if something is missing or should be removed.')}</p>
        </div>
      </div>
      <div className="stack">
        <Card>
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: 12 }}>{t('Roles')}</h3>
            <div className="row">
              {roles.map((r) => (
                <span key={r.id} className="tag">
                  {r.name}
                  {r.endsOn ? ` until ${formatDate(r.endsOn)}` : ''}
                </span>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
              {t('One-time code at sign-in:')} {mfaRequired ? <Chip size="small" color="success" label={t('Required')} /> : t('not required for your roles')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <div className="tablewrap">
            <Table size="small" aria-label={t('My permissions')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Permission')}</TableCell>
                  <TableCell>{t('Area')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...permissions]
                  .sort((a, b) => GROUP_ORDER.indexOf(labelOf(a)?.group) - GROUP_ORDER.indexOf(labelOf(b)?.group))
                  .map((p) => (
                    <TableRow key={p}>
                      <TableCell>{labelOf(p)?.label ? t(labelOf(p).label) : p}</TableCell>
                      <TableCell>{labelOf(p)?.group ? t(labelOf(p).group) : p.split('.')[0]}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
