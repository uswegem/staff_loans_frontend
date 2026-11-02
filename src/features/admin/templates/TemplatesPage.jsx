// Agreement templates (prototype #/admin/templates; FR-40, D-88). The Legal Officer
// uploads or edits a version, which waits as "Pending Legal Approval"; the Head of Legal
// approves it, or rejects it with a reason. Nobody approves a version they uploaded or
// edited, and only approved versions generate agreements. Editing an approved version
// makes a new version; the approved one stays in use until the new one is approved.
// The text is checked by rendering a sample agreement before it is saved.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { templatesApi } from '../../../api/reports';
import { apiError } from '../../../api/client';
import { formatDate } from '../../../lib/format';
import { todayEat } from '../../../lib/dates';
import FileDrop from '../../../components/FileDrop';
import AgreementDoc from '../../apply/AgreementDoc';

const STATE = {
  pending_legal_approval: ['Pending Legal Approval', 'warning'],
  rejected: ['Rejected', 'error'],
  current: ['Approved, in use', 'success'],
  scheduled: ['Approved, scheduled', 'info'],
  retired: ['Approved, retired', 'default'],
};

/** Upload a new version, or edit one (`editing` holds the version being edited). */
function EditDialog({ editing, onClose, onSaved }) {
  const approved = editing?.status === 'approved';
  const [form, setForm] = useState({
    version: editing && !approved ? editing.version : '',
    effectiveFrom: editing?.effectiveFrom && editing.effectiveFrom >= todayEat() ? editing.effectiveFrom : todayEat(),
    body: editing?.body || '',
    note: editing && !approved ? editing.note : '',
  });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (k === 'body') setPreview(null);
  };

  const readFile = async (file) => {
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
    setBusy(true);
    try {
      const body = { ...form };
      if (editing && !approved) delete body.version;
      const res = editing ? await templatesApi.edit(editing.id, body) : await templatesApi.upload(body);
      onSaved(res.message);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };

  const title = !editing ? 'Upload a new agreement version' : approved ? `Edit version ${editing.version} as a new version` : `Edit version ${editing.version}`;
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {approved && <Alert severity="info">Version {editing.version} is approved, so it is not changed. Your edit is saved as a new version and waits for the Head of Legal; {editing.version} stays in use until then.</Alert>}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <TextField label="Version" required value={form.version} onChange={set('version')} placeholder="2027.01" disabled={!!editing && !approved} />
            <TextField label="Use from" type="date" required value={form.effectiveFrom} onChange={set('effectiveFrom')} InputLabelProps={{ shrink: true }} inputProps={{ min: todayEat() }} />
          </div>
          <FileDrop accept=".txt,.md" label="The template text file" inputLabel="Choose template text file" hint="A .txt or .md file in the SLAS markup. Or paste the text below." onFile={readFile} />
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
          {error && <Alert severity="error" role="alert">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !preview}>Send for Legal approval</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function RejectDialog({ version, onClose, onReject }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = async () => {
    if (!reason.trim()) return setError('Give the reason for rejecting.');
    try {
      await onReject(reason.trim());
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Reject version {version}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField label="Reason" required multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} helperText="The Legal Officer sees this and edits the text." />
        {error && <Alert severity="error" role="alert">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={submit}>Reject</Button>
      </DialogActions>
    </Dialog>
  );
}

function ViewDialog({ id, canEdit, canApprove, myId, onClose, onEdit, onApprove, onReject }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    templatesApi.get(id).then(setT).catch((e) => setError(apiError(e).message));
  }, [id]);
  const own = t && (t.editorIds || []).includes(myId);
  const pending = t?.status === 'pending_legal_approval';
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t ? `Version ${t.version}` : 'Agreement version'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {t?.rejectionReason && t.status === 'rejected' && <Alert severity="warning" sx={{ mb: 2 }}>Rejected: {t.rejectionReason}</Alert>}
        {pending && canApprove && own && <Alert severity="info" sx={{ mb: 2 }}>You uploaded or edited this version, so another Head of Legal must approve it.</Alert>}
        {t && <><p className="small muted">Rendered with a fictional applicant.</p><AgreementDoc blocks={t.blocks} open /></>}
      </DialogContent>
      <DialogActions>
        {t && canEdit && <Button onClick={() => onEdit(t)}>{t.status === 'approved' ? 'Edit as new version' : 'Edit'}</Button>}
        {t && pending && canApprove && !own && (
          <>
            <Button onClick={() => onReject(t)}>Reject</Button>
            <Button variant="contained" onClick={() => onApprove(t)}>Approve</Button>
          </>
        )}
        <Button variant={pending && canApprove && !own ? 'text' : 'contained'} onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const permissions = useSelector((st) => st.auth.permissions);
  const myId = useSelector((st) => st.auth.user?.id);
  const canEdit = permissions.includes('admin.templates');
  const canApprove = permissions.includes('templates.approve');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined: closed; null: new upload
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = () => templatesApi.list().then(setData).catch((e) => setError(apiError(e).message));
  useEffect(() => {
    load();
  }, []);

  const done = (message) => {
    setEditing(undefined);
    setViewing(null);
    setRejecting(null);
    setToast(message);
    load();
  };
  const approve = async (t) => {
    try {
      done((await templatesApi.approve(t.id)).message);
    } catch (err) {
      setViewing(null);
      setError(apiError(err).message);
    }
  };
  const openEdit = async (t) => {
    setViewing(null);
    setEditing(t.body !== undefined ? t : await templatesApi.get(t.id));
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Agreement templates</h1>
          <p>The Legal Officer uploads and edits versions; the Head of Legal approves them. Only approved versions are used, and each loan keeps the version its staff member accepted.</p>
        </div>
        {canEdit && <Button variant="contained" onClick={() => setEditing(null)}>Upload new version</Button>}
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {data?.items.some((t) => t.state === 'current' && t.sample) && (
        <Alert severity="warning" sx={{ mb: 2 }}>The version in use holds the prototype&apos;s sample clauses. Upload the Legal-approved Mkataba before go-live.</Alert>
      )}
      <Card>
        <div className="tablewrap">
          <Table aria-label="Agreement versions">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used from</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Legal decision</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Agreements</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((t) => {
                const [label, color] = STATE[t.state] || [t.statusLabel, 'default'];
                return (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.version}{t.sample && <span className="tag" style={{ marginLeft: 6 }}>Sample</span>}</TableCell>
                    <TableCell><Chip size="small" color={color} label={label} /></TableCell>
                    <TableCell>{formatDate(t.effectiveFrom)}</TableCell>
                    <TableCell>{formatDate(t.loadedAt)}{t.loadedBy ? `, ${t.loadedBy}` : ''}</TableCell>
                    <TableCell className="small">
                      {t.approvedAt && `Approved ${formatDate(t.approvedAt)}${t.approvedBy ? ` by ${t.approvedBy}` : ''}`}
                      {t.rejectedAt && `Rejected ${formatDate(t.rejectedAt)}${t.rejectedBy ? ` by ${t.rejectedBy}` : ''}: ${t.rejectionReason}`}
                      {!t.approvedAt && !t.rejectedAt && '—'}
                    </TableCell>
                    <TableCell className="small">{t.note}</TableCell>
                    <TableCell align="right" className="num">{t.agreements}</TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => setViewing(t.id)}>{t.status === 'pending_legal_approval' && canApprove && !t.editorIds.includes(myId) ? 'Review' : 'View'}</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
      {editing !== undefined && <EditDialog editing={editing} onClose={() => setEditing(undefined)} onSaved={done} />}
      {viewing && (
        <ViewDialog
          id={viewing}
          myId={myId}
          canEdit={canEdit}
          canApprove={canApprove}
          onClose={() => setViewing(null)}
          onEdit={openEdit}
          onApprove={approve}
          onReject={(t) => {
            setViewing(null);
            setRejecting(t);
          }}
        />
      )}
      {rejecting && <RejectDialog version={rejecting.version} onClose={() => setRejecting(null)} onReject={async (reason) => done((await templatesApi.reject(rejecting.id, reason)).message)} />}
    </div>
  );
}
