// One of my applications (prototype #/applications/:id; FR-11, 7.3): progress route,
// history with comments, the terms, agreement, documents, the repayment schedule
// (FR-25), correct or withdraw.

import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import LoanRoute from '../../components/LoanRoute';
import AppStatusChip from '../../components/AppStatusChip';
import { STATUS } from '../../lib/statuses';
import SuccessScreen from '../../components/ux/SuccessScreen';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';
import WithdrawDialog from '../../components/WithdrawDialog';

const ACTIONS = {
  create: ['Started', ''],
  submit: ['Signed agreement and submitted', 'info'],
  resubmit: ['Signed a new agreement and resubmitted', 'info'],
  approve: ['Approved', 'ok'],
  return: ['Returned for correction', 'warn'],
  reject: ['Rejected', 'bad'],
  withdraw: ['Withdrawn', ''],
  accept_revised: ['Accepted revised terms', 'ok'],
  decline_revised: ['Declined revised terms', 'bad'],
  disburse: ['Disbursement confirmed', 'ok'],
};

function Schedule({ app }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const rows = all ? app.schedule : app.schedule.slice(0, 6);
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>{t('Repayment schedule')}</h3>
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          {app.scheduleBasis === 'disbursement' ? t('From the disbursement date, {date}.', { date: formatDate(app.disbursement?.date) }) : t('From final approval. It is set again from the date OPS disburses the loan.')}
        </p>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Repayment schedule')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('No.')}</TableCell>
                <TableCell>{t('Due')}</TableCell>
                <TableCell align="right">{t('Principal')}</TableCell>
                <TableCell align="right">{t('Interest')}</TableCell>
                <TableCell align="right">{t('Instalment')}</TableCell>
                <TableCell align="right">{t('Balance')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.n}>
                  <TableCell>{r.n}</TableCell>
                  <TableCell>{formatDate(r.due)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.principal)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.interest)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.payment)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {app.schedule.length > 6 && <Button variant="text" size="small" sx={{ mt: 1 }} onClick={() => setAll((v) => !v)}>{all ? t('Show the first 6') : t('Show all {n} instalments', { n: app.schedule.length })}</Button>}
      </CardContent>
    </Card>
  );
}

export default function ApplicationPage() {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    applicationsApi.get(id).then(setApp).catch((e) => setError(apiError(e).message));
  }, [id]);

  if (error && !app) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!app) return <div className="page"><LoadingSkeleton label={t('Loading…')} rows={3} /></div>;
  const current = app.agreements.find((a) => a.status !== 'void') || app.agreements[0];
  const returned = [...app.history].reverse().find((h) => h.action === 'return');

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/applications" color="inherit">{t('My applications')}</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{app.ref}</h1>
          <p>{app.product.name}, {t('{amount} over {n} months', { amount: formatTzs(app.approved?.amount || app.amount), n: app.approved?.tenor || app.tenor })} <AppStatusChip status={app.status} /></p>
        </div>
        <div className="row">
          {app.status === 'returned' && <Button variant="contained" component={RouterLink} to={`/apply/${app.id}`}>{t('Correct application')}</Button>}
          {app.withdrawable && app.status !== 'draft' && <Button onClick={() => setWithdrawing(true)}>{t('Withdraw')}</Button>}
        </div>
      </div>
      <div className="stack">
        {params.get('submitted') && app.cycle > 0 && app.history.some((h) => h.action === 'submit' || h.action === 'resubmit') && !['draft', 'returned', 'rejected', 'withdrawn', 'declined'].includes(app.status) && (
          <SuccessScreen
            title={t('Application submitted successfully')}
            message={t('Your agreement {number} is signed. It takes effect when the application gets final approval on these terms.', { number: current?.number })}
            details={[
              { label: t('Application reference'), value: app.ref },
              { label: t('Loan product'), value: app.product.name },
              { label: t('Requested amount'), value: formatTzs(app.amount) },
              { label: t('Current status'), value: t(app.statusLabel || STATUS[app.status]?.[0] || app.status) },
            ]}
          />
        )}
        {app.status === 'pending_reaccept' && (
          <Alert severity="warning" action={<Button variant="contained" size="small" component={RouterLink} to={`/accept/${app.id}`}>{t('Review revised terms')}</Button>}>
            <AlertTitle>{t('Approved at revised terms')}</AlertTitle>
            {t('{amount} over {n} months.', { amount: formatTzs(app.approved?.amount), n: app.approved?.tenor })} {t('Read and accept the revised agreement so OPS can disburse.')}
          </Alert>
        )}
        {app.status === 'disbursed' && app.disbursement && (
          <Alert severity="success">
            <AlertTitle>{t('Disbursed on {date}', { date: formatDate(app.disbursement.date) })}</AlertTitle>
            {app.disbursement.transactionRef ? t('{amount} was paid out (reference {ref}).', { amount: formatTzs(app.approved?.amount), ref: app.disbursement.transactionRef }) : t('{amount} was paid out.', { amount: formatTzs(app.approved?.amount) })} {t('Your first instalment of {amount} is due on {date}.', { amount: formatTzs(app.schedule?.[0]?.payment), date: formatDate(app.schedule?.[0]?.due) })}
          </Alert>
        )}
        {returned && app.status === 'returned' && (
          <Alert severity="warning">
            <AlertTitle>{t('Returned for correction')}</AlertTitle>
            {returned.comment}
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <LoanRoute app={app} />
            {app.stageDueAt && app.currentStage && <p className="small muted" style={{ margin: '8px 0 0' }}>{t('Target for this stage: {when}.', { when: formatDateTime(app.stageDueAt) })}</p>}
          </CardContent>
        </Card>
        <div className={s.split}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <h3 style={{ marginBottom: 16 }}>{t('History')}</h3>
              <ul className={s.tl}>
                {app.history.map((h, i) => {
                  const [label, tone] = ACTIONS[h.action] || [h.action, ''];
                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={i}>
                      <span className={`${s.mk} ${tone ? s[tone] : ''}`} />
                      <div style={{ fontWeight: 600 }}>{t(label)}</div>
                      <div className={s.when}>{formatDateTime(h.at)}</div>
                      {h.comment && <div className={s.cmt}>{h.comment}</div>}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <div className="stack">
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 12 }}>{t('Loan')}</h3>
                <dl className={s.kv}>
                  <dt>{t('Amount')}</dt><dd>{formatTzs(app.amount)}</dd>
                  <dt>{t('Tenor')}</dt><dd>{t('{n} months', { n: app.tenor })}</dd>
                  <dt>{t('Instalment')}</dt><dd>{formatTzs(current?.terms?.instalment ?? app.quote.instalment)}</dd>
                  <dt>{t('Purpose')}</dt><dd>{app.purpose}</dd>
                  <dt>{t('Repayment')}</dt><dd>{t('Salary deduction')}</dd>
                  <dt>{t('Submitted')}</dt><dd>{formatDate(app.submittedAt)}</dd>
                </dl>
              </CardContent>
            </Card>
            {app.agreements.length > 0 && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <h3 style={{ marginBottom: 12 }}>{t('Agreement')}</h3>
                  {app.agreements.map((a) => (
                    <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
                      <span>
                        <Link component={RouterLink} to={`/agreement/${a.id}`}>{a.number}</Link>{' '}
                        <span className="small muted">{a.status === 'void' ? `void: ${a.voidReason}` : a.status === 'in_force' ? 'in force' : 'signed, awaiting approval'}</span>
                      </span>
                      <Button size="small" variant="text" onClick={() => downloadFile(`/agreements/${a.id}/pdf`, `${a.number}.pdf`).catch((e) => setError(apiError(e).message))}>{t('PDF')}</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 12 }}>{t('Documents')}</h3>
                {app.documents.length ? (
                  app.documents.map((d) => (
                    <div key={d.id}>
                      <Link component="button" type="button" onClick={() => downloadFile(`/files/${d.id}`, d.originalName).catch((e) => setError(apiError(e).message))}>{d.originalName}</Link>
                    </div>
                  ))
                ) : (
                  <span className="small muted">{t('None attached')}</span>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {app.schedule && <Schedule app={app} />}
      </div>
      {withdrawing && (
        <WithdrawDialog
          onClose={() => setWithdrawing(false)}
          onConfirm={async (reason) => {
            try {
              setApp(await applicationsApi.withdraw(app.id, reason));
            } catch (e) {
              setError(apiError(e).message);
            }
            setWithdrawing(false);
          }}
        />
      )}
    </div>
  );
}
