// Agreement templates (prototype #/admin/templates; FR-40). Load a new version only
// after Legal approves it. The text is checked by rendering a sample agreement, which
// the administrator sees before loading. Each loan keeps the version it was signed on.

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { templatesApi } from '../../../api/reports';
import { apiError } from '../../../api/client';
import { formatDate } from '../../../lib/format';
import { todayEat } from '../../../lib/dates';
import AgreementDoc from '../../apply/AgreementDoc';

const STATE = { current: ['In use', 'success'], scheduled: ['Scheduled', 'info'], retired: ['Retired', 'default'] };

function LoadDialog({ onClose, onLoaded }) {
  const [form, setForm] = useState({ version: '', effectiveFrom: todayEat(), body: '', legalApproved: false, legalApprovalRef: '', note: '' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    if (k === 'body') setPreview(null);
  };

  const readFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('Use the template text file (.txt or .md) in the SLAS markup.');
      return;
    }
    setForm((f) => ({ ...f, body: '' }));
    const text = await file.text();
    setForm((f) => ({ ...f, body: text }));
    setPreview(null);
    setError(null);
  };

  const check = async () => {
    setError(null);
    try {
      setPreview(await templatesApi.preview(form.body));
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.legalApproved) return setError('Legal must approve the text before it is loaded.');
    setBusy(true);
    try {
      const res = await templatesApi.load(form);
      onLoaded(res.message);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Load a new agreement version</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <TextField label="Version" required value={form.version} onChange={set('version')} placeholder="2027.01" />
            <TextField label="Use from" type="date" required value={form.effectiveFrom} onChange={set('effectiveFrom')} InputLabelProps={{ shrink: true }} inputProps={{ min: todayEat() }} />
            <TextField label="Legal approval reference" value={form.legalApprovalRef} onChange={set('legalApprovalRef')} placeholder="Optional" />
          </div>
          <div>
            <Button component="label" size="small">
              Choose text file
              <input type="file" accept=".txt,.md" hidden onChange={readFile} />
            </Button>
            <span className="xs muted" style={{ marginLeft: 8 }}>Or paste the text below.</span>
          </div>
          <TextField
            label="Agreement text"
            required
            multiline
            minRows={8}
            maxRows={16}
            value={form.body}
            onChange={set('body')}
            inputProps={{ lang: 'sw', style: { fontFamily: 'monospace', fontSize: 13 } }}
            helperText="# title, ## heading, 1. clause, - item, ~ note; values in {{double braces}}; {{schedule}} on its own line for the Jedwali."
          />
          <TextField label="What changed" multiline minRows={2} value={form.note} onChange={set('note')} />
          <div className="row">
            <Button onClick={check} disabled={!form.body.trim()}>Check and preview</Button>
            {preview && <span className="small" style={{ color: 'var(--ok)' }}>Renders correctly with a sample applicant.</span>}
          </div>
          {preview && <AgreementDoc blocks={preview.blocks} />}
          <FormControlLabel control={<Checkbox checked={form.legalApproved} onChange={set('legalApproved')} />} label="Legal has approved this text" />
          {error && <Alert severity="error" role="alert">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !preview}>Load version</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ViewDialog({ id, onClose }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    templatesApi.get(id).then(setT).catch((e) => setError(apiError(e).message));
  }, [id]);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t ? `Version ${t.version}` : 'Agreement version'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {t && <><p className="small muted">Rendered with a fictional applicant.</p><AgreementDoc blocks={t.blocks} open /></>}
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = () => templatesApi.list().then(setData).catch((e) => setError(apiError(e).message));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Agreement templates</h1>
          <p>Load a new version only after Legal approves it. Each loan keeps the version its staff member accepted.</p>
        </div>
        <Button variant="contained" onClick={() => setLoading(true)}>Load new version</Button>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data?.items.some((t) => t.state === 'current' && t.sample) && (
        <Alert severity="warning" sx={{ mb: 2 }}>The version in use holds the prototype&apos;s sample clauses. Load the Legal-approved Mkataba before go-live.</Alert>
      )}
      <Card>
        <div className="tablewrap">
          <Table aria-label="Agreement versions">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used from</TableCell>
                <TableCell>Legal approval</TableCell>
                <TableCell>Loaded</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Agreements</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{t.version}{t.sample && <span className="tag" style={{ marginLeft: 6 }}>Sample</span>}</TableCell>
                  <TableCell><Chip size="small" color={STATE[t.state][1]} label={STATE[t.state][0]} /></TableCell>
                  <TableCell>{formatDate(t.effectiveFrom)}</TableCell>
                  <TableCell>{t.legalApproved ? `Approved${t.legalApprovalRef ? `, ${t.legalApprovalRef}` : ''}` : 'Pending'}</TableCell>
                  <TableCell>{formatDate(t.loadedAt)}{t.loadedBy ? `, ${t.loadedBy}` : ''}</TableCell>
                  <TableCell className="small">{t.note}</TableCell>
                  <TableCell align="right" className="num">{t.agreements}</TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => setViewing(t.id)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      {loading && (
        <LoadDialog
          onClose={() => setLoading(false)}
          onLoaded={(message) => {
            setLoading(false);
            setToast(message);
            load();
          }}
        />
      )}
      {viewing && <ViewDialog id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
