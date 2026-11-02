// Review queue (prototype #/queue; FR-13): waiting, overdue and handled, with the
// working-hours clock. Limited-details rows show only the name (FR-55).

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Card, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs } from '@mui/material';
import { reviewApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import DueClock from '../../components/DueClock';
import AppStatusChip from '../../components/AppStatusChip';

export default function QueuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(location.state?.toast || null);
  const [tab, setTab] = useState('waiting');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    reviewApi.queue(tab).then(setData).catch((e) => setError(apiError(e).message));
  }, [tab]);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Review queue</h1>
          <p>Applications waiting for your decision. Target: 8 working hours per stage, 48 for the CEO.</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data?.covering?.map((c) => (
        <Alert key={c.name} severity="info" sx={{ mb: 2 }}>
          <AlertTitle>You are covering for {c.name} until {formatDate(c.until)}</AlertTitle>
          Their reviews appear here. Your decisions are recorded on their behalf.
        </Alert>
      ))}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} aria-label="Queue">
          <Tab value="waiting" label={`Waiting for me${data ? ` (${data.counts.waiting})` : ''}`} />
          <Tab value="overdue" label={`Overdue${data ? ` (${data.counts.overdue})` : ''}`} />
          <Tab value="handled" label="Handled by me" />
        </Tabs>
        {data && data.items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'handled' ? 'Nothing handled yet' : 'Nothing waiting for you'}</h3>
            <p className="muted">{tab === 'handled' ? 'Applications you decide on appear here.' : 'New applications appear here, and you get an in-app notification.'}</p>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label="Applications">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Amount (TZS)</TableCell>
                  <TableCell align="right">Tenor</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>{tab === 'handled' ? 'Status' : 'Time left'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/review/${r.id}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.ref}</TableCell>
                    <TableCell>
                      {r.applicant.fullName || `${r.applicant.firstName} ${r.applicant.lastName}`}
                      <div className="xs muted">{r.limited ? 'Identity only' : `${r.applicant.title}, ${r.applicant.category}`}{r.onBehalfOf ? `; for ${r.onBehalfOf}` : ''}</div>
                    </TableCell>
                    {r.limited ? (
                      <TableCell colSpan={3}>
                        <span className="tag">Limited details</span> <span className="xs muted">Name, NIDA and mobile only</span>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>{r.product}</TableCell>
                        <TableCell align="right" className="num">{formatNumber(r.amount)}</TableCell>
                        <TableCell align="right">{r.tenor} m</TableCell>
                      </>
                    )}
                    <TableCell>{r.stageLabel || '—'}</TableCell>
                    <TableCell>{tab === 'handled' ? <AppStatusChip status={r.status} /> : <DueClock due={r.due} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
