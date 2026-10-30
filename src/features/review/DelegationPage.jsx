// My delegation (prototype #/delegation; FR-19): a colleague reviews on my behalf
// between two dates. The server refuses combinations that break segregation of duties.

import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Card, CardContent, Chip, TextField } from '@mui/material';
import { delegationApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import s from '../apply/apply.module.css';

const STATUS = { active: ['Active', 'success'], scheduled: ['Scheduled', 'default'], ended: ['Ended', 'default'] };

export default function DelegationPage() {
  const [data, setData] = useState(null);
  const [options, setOptions] = useState([]);
  const [q, setQ] = useState('');
  const [delegate, setDelegate] = useState(null);
  const [from, setFrom] = useState(todayEat());
  const [until, setUntil] = useState(todayEat(new Date(Date.now() + 5 * 24 * 3600 * 1000)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => delegationApi.list().then(setData).catch((e) => setError(apiError(e).message));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => delegationApi.candidates(q).then(setOptions).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (!delegate) return setError('Choose a delegate.');
    try {
      await delegationApi.create({ delegateUserId: delegate.id, from, until, reason });
      setToast(`Delegation saved. ${delegate.name} has been notified.`);
      setDelegate(null);
      load();
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>My delegation</h1>
          <p>While you are away, someone else can review on your behalf. Their decisions are recorded as on behalf of you.</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      <div className={s.split}>
        <Card component="form" onSubmit={save} noValidate>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>Set a delegate</h3></div>
          <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Autocomplete
              options={options}
              value={delegate}
              onChange={(_, v) => setDelegate(v)}
              onInputChange={(_, v) => setQ(v)}
              getOptionLabel={(o) => `${o.name}, ${o.title || o.staffNo}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Delegate" required helperText="They cannot review their own applications." />}
            />
            <div className={s.grid}>
              <TextField label="From" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} inputProps={{ min: todayEat() }} />
              <TextField label="Until" type="date" required value={until} onChange={(e) => setUntil(e.target.value)} inputProps={{ min: from }} />
            </div>
            <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, annual leave" />
            <div className="row"><Button type="submit" variant="contained">Save delegation</Button></div>
          </CardContent>
        </Card>
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>Current and past</h3></div>
          <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
            {data && !data.given.length && !data.received.length && <p className="muted small" style={{ margin: 0 }}>No delegation set. Your reviews stay with you.</p>}
            {data?.given.map((d) => (
              <div key={d.id} style={{ borderBottom: '1px solid var(--line-2)', paddingBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>To {d.delegate?.name}</b>
                  <Chip size="small" color={STATUS[d.status][1]} label={STATUS[d.status][0]} />
                </div>
                <p className="small" style={{ margin: '4px 0' }}>{formatDate(d.from)} to {formatDate(d.until)}{d.reason ? `, ${d.reason}` : ''}</p>
                {d.status !== 'ended' && <Button size="small" sx={{ color: 'var(--bad)' }} onClick={async () => { await delegationApi.end(d.id); load(); }}>End delegation</Button>}
              </div>
            ))}
            {data?.received.map((d) => (
              <div key={d.id}>
                <b>Covering for {d.delegator?.name}</b> <Chip size="small" color={STATUS[d.status][1]} label={STATUS[d.status][0]} />
                <p className="small" style={{ margin: '4px 0' }}>{formatDate(d.from)} to {formatDate(d.until)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
