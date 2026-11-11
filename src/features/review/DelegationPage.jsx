// My delegation (prototype #/delegation; FR-19): a colleague reviews on my behalf
// between two dates. The server refuses combinations that break segregation of duties.

import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Card, CardContent, Chip, TextField } from '@mui/material';
import { delegationApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';

const STATUS = { active: ['Active', 'success'], scheduled: ['Scheduled', 'default'], ended: ['Ended', 'default'] };

export default function DelegationPage() {
  const t = useT();
  const [data, setData] = useState(null);
  const [options, setOptions] = useState([]);
  const [q, setQ] = useState('');
  const [delegate, setDelegate] = useState(null);
  const [from, setFrom] = useState(todayEat());
  const [until, setUntil] = useState(todayEat(new Date(Date.now() + 5 * 24 * 3600 * 1000)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const load = () => delegationApi.list().then(setData).catch((e) => setError(apiError(e).message));
  useEffect(() => {
    load();
  }, []);
  // Names for the text as typed; an answer for earlier text is dropped.
  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => delegationApi.candidates(q).then((o) => { if (current) { setOptions(o); setLookupError(null); } }).catch((err) => { if (current) { setOptions([]); setLookupError(apiError(err).message); } }), 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [q]);

  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  // Re-checked on every change once a save was tried; the API's answer stays until the next save.
  const problem = (tried && !delegate && t('Choose a delegate.')) || error;

  const save = async (e) => {
    e.preventDefault();
    if (busy) return undefined;
    setTried(true);
    setError(null);
    if (!delegate) return undefined;
    setBusy(true);
    try {
      await delegationApi.create({ delegateUserId: delegate.id, from, until, reason });
      setToast(t('Delegation saved. {name} has been notified.', { name: delegate.name }));
      setDelegate(null);
      setTried(false);
      load();
    } catch (err) {
      setError(apiError(err).message);
    }
    setBusy(false);
    return undefined;
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('My delegation')}</h1>
          <p>{t('While you are away, someone else can review on your behalf. Their decisions are recorded as on behalf of you.')}</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      <div className={s.split}>
        <Card component="form" onSubmit={save} noValidate>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('Set a delegate')}</h3></div>
          <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
            {problem && <Alert severity="error">{problem}</Alert>}
            {lookupError && <Alert severity="error">{lookupError}</Alert>}
            <Autocomplete
              options={options}
              value={delegate}
              onChange={(_, v) => setDelegate(v)}
              onInputChange={(_, v) => setQ(v)}
              getOptionLabel={(o) => `${o.name}, ${o.title || o.staffNo}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label={t('Delegate')} required helperText={t('They cannot review their own applications.')} />}
            />
            <div className={s.grid}>
              <TextField label={t('From')} type="date" required value={from} onChange={(e) => setFrom(e.target.value)} inputProps={{ min: todayEat() }} />
              <TextField label={t('Until')} type="date" required value={until} onChange={(e) => setUntil(e.target.value)} inputProps={{ min: from }} />
            </div>
            <TextField label={t('Reason')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('For example, annual leave')} />
            <div className="row"><Button type="submit" variant="contained" disabled={busy}>{t('Save delegation')}</Button></div>
          </CardContent>
        </Card>
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('Current and past')}</h3></div>
          <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
            {data && !data.given.length && !data.received.length && <p className="muted small" style={{ margin: 0 }}>{t('No delegation set. Your reviews stay with you.')}</p>}
            {data?.given.map((d) => (
              <div key={d.id} style={{ borderBottom: '1px solid var(--line-2)', paddingBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <b>To {d.delegate?.name}</b>
                  <Chip size="small" color={STATUS[d.status][1]} label={t(STATUS[d.status][0])} />
                </div>
                <p className="small" style={{ margin: '4px 0' }}>{t('{from} to {until}', { from: formatDate(d.from), until: formatDate(d.until) })}{d.reason ? `, ${d.reason}` : ''}</p>
                {d.status !== 'ended' && <Button size="small" sx={{ color: 'var(--bad)' }} onClick={async () => { try { setError(null); await delegationApi.end(d.id); await load(); setToast(t('Delegation ended.')); } catch (err) { setError(apiError(err).message); } }}>{t('End delegation')}</Button>}
              </div>
            ))}
            {data?.received.map((d) => (
              <div key={d.id}>
                <b>{t('Covering for {name}', { name: d.delegator?.name })}</b> <Chip size="small" color={STATUS[d.status][1]} label={t(STATUS[d.status][0])} />
                <p className="small" style={{ margin: '4px 0' }}>{t('{from} to {until}', { from: formatDate(d.from), until: formatDate(d.until) })}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
