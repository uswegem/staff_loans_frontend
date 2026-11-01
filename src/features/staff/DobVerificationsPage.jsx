// Dates of birth waiting for People and Culture (D-82). Approve or reject with a
// reason; the person who submitted a change, and the staff member concerned, cannot
// decide it (the API enforces both).

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { dobApi } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime } from '../../lib/format';

function RejectDialog({ row, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return setError('Give a reason for the rejection.');
    try {
      await dobApi.reject(row.id, reason.trim());
      onDone(`${row.staff.name}: proposed date of birth rejected.`);
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Reject {formatDate(row.proposed)} for {row.staff.name}?</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>The staff member sees the reason. {row.current ? `${formatDate(row.current)} stays in use.` : 'They cannot apply for a loan until a date is verified.'}</p>
          <TextField label="Reason" required multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} error={!!error} helperText={error || 'For example: does not match the NIDA card.'} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Reject</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function DobVerificationsPage() {
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
          <h1>Date of birth verifications</h1>
          <p>A new or changed date of birth is used for loans only after you verify it against the staff member&apos;s documents. You cannot verify a change you submitted, or your own date of birth.</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setItems(null); }} sx={{ px: 2 }} aria-label="Verifications">
          <Tab value="pending" label="Waiting" />
          <Tab value="approved" label="Verified" />
          <Tab value="rejected" label="Rejected" />
        </Tabs>
        {items && items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'pending' ? 'Nothing waiting' : 'Nothing here yet'}</h3>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label="Date of birth changes">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Verified now</TableCell>
                  <TableCell>Proposed</TableCell>
                  <TableCell>Submitted</TableCell>
                  {tab !== 'pending' && <TableCell>Decision</TableCell>}
                  {tab === 'pending' && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {items?.map((r) => {
                  const own = r.submittedById && r.submittedById === myId;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.staff.name}<div className="xs muted">{r.staff.staffNo}{r.staff.title ? `, ${r.staff.title}` : ''}</div></TableCell>
                      <TableCell>{r.current ? formatDate(r.current) : <span className="muted">None</span>}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatDate(r.proposed)}</TableCell>
                      <TableCell>{r.submittedBy}<div className="xs muted">{formatDateTime(r.submittedAt)}</div></TableCell>
                      {tab !== 'pending' && <TableCell>{r.decidedBy}, {formatDateTime(r.decidedAt)}{r.reason && <div className="xs muted">{r.reason}</div>}</TableCell>}
                      {tab === 'pending' && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {own ? (
                            <span className="xs muted">You submitted this; another verifier decides it.</span>
                          ) : (
                            <>
                              <Button size="small" variant="contained" onClick={() => approve(r)}>Approve</Button>{' '}
                              <Button size="small" onClick={() => setRejecting(r)}>Reject</Button>
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
