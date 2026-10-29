// Every version of a product, with who made and checked it (FR-61, FR-63).

import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Card, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { productsApi } from '../../../api/products';
import { apiError } from '../../../api/client';
import { formatDate, formatDateTime } from '../../../lib/format';
import StateChip, { PRODUCT_STATUS } from '../../../components/StateChip';

const CHANGE_TYPE = { create: 'New product', change: 'Change', deactivate: 'Deactivation' };

export default function ProductHistoryPage() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    productsApi.adminGet(id).then(setP).catch((err) => setError(apiError(err).message));
  }, [id]);

  if (error) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!p) return <p className="muted" role="status">Loading…</p>;
  const name = p.versions.find((v) => ['active', 'inactive'].includes(v.state))?.name || p.versions[0]?.name;

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <Link component={RouterLink} to="/admin/products" color="inherit">Products and pricing</Link>
      </div>
      <div className="pagehead">
        <div>
          <h1>{name}</h1>
          <p>{p.code} <StateChip state={p.status} map={PRODUCT_STATUS} /></p>
        </div>
      </div>
      <Card>
        <div className="tablewrap">
          <Table aria-label="Versions">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Effective from</TableCell>
                <TableCell>Live from</TableCell>
                <TableCell>Maker</TableCell>
                <TableCell>Checker</TableCell>
                <TableCell>Decided</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {p.versions.map((v) => (
                <TableRow key={v.id} hover>
                  <TableCell><Link component={RouterLink} to={`/admin/products/versions/${v.id}`}>Version {v.version}</Link></TableCell>
                  <TableCell>{CHANGE_TYPE[v.changeType]}</TableCell>
                  <TableCell><StateChip state={v.state} /></TableCell>
                  <TableCell>{formatDate(v.effectiveFrom)}</TableCell>
                  <TableCell>{v.liveFrom ? formatDateTime(v.liveFrom) : '—'}</TableCell>
                  <TableCell>{v.maker?.name || '—'}</TableCell>
                  <TableCell>{v.checker?.name || '—'}</TableCell>
                  <TableCell>{v.decidedAt ? formatDateTime(v.decidedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
