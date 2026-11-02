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
import { useT } from '../../i18n';

export default function QueuePage() {
  const t = useT();
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
          <h1>{t('Review queue')}</h1>
          <p>{t('Applications waiting for your decision. Target: 8 working hours per stage, 48 for the CEO.')}</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data?.covering?.map((c) => (
        <Alert key={c.name} severity="info" sx={{ mb: 2 }}>
          <AlertTitle>{t('You are covering for {name} until {date}', { name: c.name, date: formatDate(c.until) })}</AlertTitle>
          {t('Their reviews appear here. Your decisions are recorded on their behalf.')}
        </Alert>
      ))}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} aria-label={t('Queue')}>
          <Tab value="waiting" label={`${t('Waiting for me')}${data ? ` (${data.counts.waiting})` : ''}`} />
          <Tab value="overdue" label={`${t('Overdue')}${data ? ` (${data.counts.overdue})` : ''}`} />
          <Tab value="handled" label={t('Handled by me')} />
        </Tabs>
        {data && data.items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'handled' ? t('Nothing handled yet') : t('Nothing waiting for you')}</h3>
            <p className="muted">{tab === 'handled' ? t('Applications you decide on appear here.') : t('New applications appear here, and you get an in-app notification.')}</p>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label={t('Applications')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Reference')}</TableCell>
                  <TableCell>{t('Applicant')}</TableCell>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell align="right">{t('Amount (TZS)')}</TableCell>
                  <TableCell align="right">{t('Tenor')}</TableCell>
                  <TableCell>{t('Stage')}</TableCell>
                  <TableCell>{tab === 'handled' ? t('Status') : t('Time left')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/review/${r.id}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.ref}</TableCell>
                    <TableCell>
                      {r.applicant.fullName || `${r.applicant.firstName} ${r.applicant.lastName}`}
                      <div className="xs muted">{r.limited ? t('Identity only') : `${r.applicant.title}, ${t(r.applicant.category)}`}{r.onBehalfOf ? `; ${t('for {name}', { name: r.onBehalfOf })}` : ''}</div>
                    </TableCell>
                    {r.limited ? (
                      <TableCell colSpan={3}>
                        <span className="tag">{t('Limited details')}</span> <span className="xs muted">{t('Name, NIDA and mobile only')}</span>
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
