// Dates of birth waiting for People and Culture (D-82). Approve or reject with a
// reason; the person who submitted a change, and the staff member concerned, cannot
// decide it (the API enforces both).

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { dobApi } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime } from '../../lib/format';
import { useT } from '../../i18n';

function RejectDialog({ row, onClose, onDone }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  // The reason rule follows the text once a submit was tried; the API's answer stays until the next one.
  const shown = (tried && !reason.trim() && t('Give a reason for the rejection.')) || error;
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return undefined;
    setTried(true);
    setError(null);
    if (!reason.trim()) return undefined;
    setBusy(true);
    try {
      await dobApi.reject(row.id, reason.trim());
      onDone(t('{name}: proposed date of birth rejected.', { name: row.staff.name }));
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
    return undefined;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t('Reject {date} for {name}?', { date: formatDate(row.proposed), name: row.staff.name })}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>{t('The staff member sees the reason.')} {row.current ? t('{date} stays in use.', { date: formatDate(row.current) }) : t('They cannot apply for a loan until a date is verified.')}</p>
          <TextField label={t('Reason')} required multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} error={!!shown} helperText={shown || t('For example: does not match the NIDA card.')} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{t('Reject')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function DobVerificationsPage() {
  const t = useT();
  const myId = useSelector((st) => st.auth.user?.id);
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(() => {
    dobApi.queue(tab).then((d) => setItems(d.items)).catch((e) => setError(apiError(e).message));
  }, [tab]);
  useEffect(load, [load]);

  const approve = async (row) => {
    setError(null);
    try {
      const res = await dobApi.approve(row.id);
      setToast(`${row.staff.name}: ${res.message}`);
      load();
    } catch (e) {
      setError(apiError(e).message);
    }
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Date of birth verifications')}</h1>
          <p>{t("A new or changed date of birth is used for loans only after you verify it against the staff member's documents. You cannot verify a change you submitted, or your own date of birth.")}</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setItems(null); }} sx={{ px: 2 }} aria-label={t('Verifications')}>
          <Tab value="pending" label={t('Waiting')} />
          <Tab value="approved" label={t('Verified')} />
          <Tab value="rejected" label={t('Rejected')} />
        </Tabs>
        {items && items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'pending' ? t('Nothing waiting') : t('Nothing here yet')}</h3>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label={t('Date of birth changes')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Staff')}</TableCell>
                  <TableCell>{t('Verified now')}</TableCell>
                  <TableCell>{t('Proposed')}</TableCell>
                  <TableCell>{t('Submitted')}</TableCell>
                  {tab !== 'pending' && <TableCell>{t('Decision')}</TableCell>}
                  {tab === 'pending' && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {items?.map((r) => {
                  const own = r.submittedById && r.submittedById === myId;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.staff.name}<div className="xs muted">{r.staff.staffNo}{r.staff.title ? `, ${r.staff.title}` : ''}</div></TableCell>
                      <TableCell>{r.current ? formatDate(r.current) : <span className="muted">{t('None')}</span>}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatDate(r.proposed)}</TableCell>
                      <TableCell>{r.submittedBy}<div className="xs muted">{formatDateTime(r.submittedAt)}</div></TableCell>
                      {tab !== 'pending' && <TableCell>{r.decidedBy}, {formatDateTime(r.decidedAt)}{r.reason && <div className="xs muted">{r.reason}</div>}</TableCell>}
                      {tab === 'pending' && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {own ? (
                            <span className="xs muted">{t('You submitted this; another verifier decides it.')}</span>
                          ) : (
                            <>
                              <Button size="small" variant="contained" onClick={() => approve(r)}>{t('Approve')}</Button>{' '}
                              <Button size="small" onClick={() => setRejecting(r)}>{t('Reject')}</Button>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {rejecting && (
        <RejectDialog
          row={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(message) => {
            setRejecting(null);
            setToast(message);
            load();
          }}
        />
      )}
    </div>
  );
}
