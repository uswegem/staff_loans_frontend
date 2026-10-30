// Accept revised terms (prototype #/accept/:id; FR-38, FR-54): signed vs approved terms
// with the reason, the revised Swahili agreement with the scroll gate, tick and
// password; or decline with a reason.

import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Link, TextField } from '@mui/material';
import { reviewApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatDate, formatTzs } from '../../lib/format';
import AgreementDoc from '../apply/AgreementDoc';
import s from '../apply/apply.module.css';

export default function AcceptRevisedPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const docRef = useRef(null);
  const [r, setR] = useState(null);
  const [read, setRead] = useState(false);
  const [progress, setProgress] = useState(0);
  const [agree, setAgree] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    reviewApi.revised(id).then(setR).catch((e) => setError(apiError(e).message));
  }, [id]);
  useEffect(() => {
    const d = docRef.current;
    if (d && d.scrollHeight <= d.clientHeight + 4) {
      setRead(true);
      setProgress(100);
    }
  }, [r]);

  const onScroll = () => {
    const d = docRef.current;
    const ratio = (d.scrollTop + d.clientHeight) / d.scrollHeight;
    setProgress(Math.min(100, ratio * 100));
    if (ratio > 0.985) setRead(true);
  };

  const accept = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await reviewApi.acceptRevised(id, { accepted: agree, scrolledToEnd: read, password, textSha256: r.textSha256 });
      navigate(`/applications/${id}`);
    } catch (err) {
      const x = apiError(err);
      setError(x.code === 'PASSWORD_WRONG' ? `Your password is not right. ${x.details.remainingAttempts} attempts left before the account locks.` : x.message);
      setPassword('');
      setBusy(false);
    }
  };

  const decline = async () => {
    if (reason.trim().length < 3) return setError('Say why you decline the revised terms.');
    try {
      await reviewApi.declineRevised(id, reason);
      navigate(`/applications/${id}`);
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };

  if (error && !r) return <div className="page"><Alert severity="info" action={<Button component={RouterLink} to={`/applications/${id}`}>View application</Button>}>{error}</Alert></div>;
  if (!r) return <p className="muted" role="status">Loading…</p>;
  const days = Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000)));

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to={`/applications/${id}`} color="inherit">Application</Link> / Revised terms</div>
      <div className="pagehead">
        <div>
          <h1>Accept revised terms</h1>
          <p>Accept within {days} day{days === 1 ? '' : 's'} (by {formatDate(r.expiresAt)}) or the approval lapses.</p>
        </div>
      </div>
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <div className="row" style={{ alignItems: 'stretch', gap: 24 }}>
            <div>
              <div className="xs muted">You signed for</div>
              <div className={s.big} style={{ fontSize: 26 }}>{formatTzs(r.signed.amount)}</div>
              <div className="small">{r.signed.tenor} months, agreement {r.signed.number}</div>
            </div>
            <div aria-hidden="true" style={{ alignSelf: 'center', fontSize: 24 }}>→</div>
            <div style={{ background: 'var(--brand-050)', border: '1px solid var(--y-200)', borderRadius: 8, padding: '8px 16px' }}>
              <div className="xs muted">Approved</div>
              <div className={s.big} style={{ fontSize: 26 }}>{formatTzs(r.approved.amount)}</div>
              <div className="small">{r.approved.tenor} months, instalment {formatTzs(r.approved.instalment)}</div>
            </div>
            <div className="small" style={{ flex: 1, minWidth: 220 }}><b>Why it changed</b><br />{r.reason}</div>
          </div>
        </CardContent>
      </Card>
      <div className={s.split}>
        <div>
          <AgreementDoc ref={docRef} blocks={r.blocks} onScroll={onScroll} />
          <div className={s.readbar} aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
          <p className="xs muted" role="status">{read ? 'You have reached the end of the agreement.' : 'Scroll to the end of the revised agreement to accept it.'}</p>
        </div>
        <Card className={s.sticky} component="form" onSubmit={accept} noValidate>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>Accept the revised agreement</h3></div>
          <CardContent sx={{ p: 3 }}>
            <fieldset className={s.consents} disabled={!read}>
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span><b lang="sw">Nimesoma, nimeelewa na kukubali vifungu vyote vya mkataba huu.</b><br /><span className="xs muted">I have read, understood and accept all the terms of this agreement.</span></span>
              </label>
              <TextField label="Enter your password to sign" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </fieldset>
            {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={!read || !agree || !password || busy}>Accept and sign</Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => setDeclining(true)}>Decline the revised terms</Button>
            <p className="xs muted" style={{ marginTop: 12 }}>Accepting replaces the agreement you signed when you applied. Declining closes the application and voids the agreement.</p>
          </CardContent>
        </Card>
      </div>
      <Dialog open={declining} onClose={() => setDeclining(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Decline the revised terms?</DialogTitle>
        <DialogContent>
          <TextField label="Reason" required multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} helperText="The application closes as Declined by Applicant." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclining(false)}>Keep it</Button>
          <Button variant="contained" onClick={decline}>Decline</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
