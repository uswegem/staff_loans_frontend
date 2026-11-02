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
import { useT } from '../../../i18n';

const STATE = {
  pending_legal_approval: ['Pending Legal Approval', 'warning'],
  rejected: ['Rejected', 'error'],
  current: ['Approved, in use', 'success'],
  scheduled: ['Approved, scheduled', 'info'],
  retired: ['Approved, retired', 'default'],
};

/** Upload a new version, or edit one (`editing` holds the version being edited). */
function EditDialog({ editing, onClose, onSaved }) {
  const t = useT();
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

  const title = !editing ? t('Upload a new agreement version') : approved ? t('Edit version {n} as a new version', { n: editing.version }) : t('Edit version {n}', { n: editing.version });
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {approved && <Alert severity="info">{t('Version {n} is approved, so it is not changed. Your edit is saved as a new version and waits for the Head of Legal; {n} stays in use until then.', { n: editing.version })}</Alert>}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <TextField label={t('Version')} required value={form.version} onChange={set('version')} placeholder="2027.01" disabled={!!editing && !approved} />
            <TextField label={t('Use from')} type="date" required value={form.effectiveFrom} onChange={set('effectiveFrom')} InputLabelProps={{ shrink: true }} inputProps={{ min: todayEat() }} />
          </div>
          <FileDrop accept=".txt,.md" label={t('The template text file')} inputLabel={t('Choose template text file')} hint={t('A .txt or .md file in the SLAS markup. Or paste the text below.')} onFile={readFile} />
          <TextField
            label={t('Agreement text')}
            required
            multiline
            minRows={8}
            maxRows={16}
            value={form.body}
            onChange={set('body')}
            inputProps={{ lang: 'sw', style: { fontFamily: 'monospace', fontSize: 13 } }}
            helperText={t('# title, ## heading, 1. clause, - item, ~ note; values in {{double braces}}; {{schedule}} on its own line for the Jedwali.')}
          />
          <TextField label={t('What changed')} multiline minRows={2} value={form.note} onChange={set('note')} />
          <div className="row">
            <Button onClick={check} disabled={!form.body.trim()}>{t('Check and preview')}</Button>
            {preview && <span className="small" style={{ color: 'var(--ok)' }}>{t('Renders correctly with a sample applicant.')}</span>}
          </div>
          {preview && <AgreementDoc blocks={preview.blocks} />}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || !preview}>{t('Send for Legal approval')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function RejectDialog({ version, onClose, onReject }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = async () => {
    if (!reason.trim()) return setError(t('Give the reason for rejecting.'));
    try {
      await onReject(reason.trim());
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t('Reject version {n}', { n: version })}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField label={t('Reason')} required multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} helperText={t('The Legal Officer sees this and edits the text.')} />
        {error && <Alert severity="error" role="alert">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="contained" color="error" onClick={submit}>{t('Reject')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ViewDialog({ id, canEdit, canApprove, myId, onClose, onEdit, onApprove, onReject }) {
  const t = useT();
  const [tpl, setTpl] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    templatesApi.get(id).then(setTpl).catch((e) => setError(apiError(e).message));
  }, [id]);
  const own = tpl && (tpl.editorIds || []).includes(myId);
  const pending = tpl?.status === 'pending_legal_approval';
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{tpl ? t('Version {n}', { n: tpl.version }) : t('Agreement version')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {tpl?.rejectionReason && tpl.status === 'rejected' && <Alert severity="warning" sx={{ mb: 2 }}>{t('Rejected:')} {tpl.rejectionReason}</Alert>}
        {pending && canApprove && own && <Alert severity="info" sx={{ mb: 2 }}>{t('You uploaded or edited this version, so another Head of Legal must approve it.')}</Alert>}
        {tpl && <><p className="small muted">{t('Rendered with a fictional applicant.')}</p><AgreementDoc blocks={tpl.blocks} open /></>}
      </DialogContent>
      <DialogActions>
        {tpl && canEdit && <Button onClick={() => onEdit(tpl)}>{tpl.status === 'approved' ? t('Edit as new version') : t('Edit')}</Button>}
        {tpl && pending && canApprove && !own && (
          <>
            <Button onClick={() => onReject(tpl)}>{t('Reject')}</Button>
            <Button variant="contained" onClick={() => onApprove(tpl)}>{t('Approve')}</Button>
          </>
        )}
        <Button variant={pending && canApprove && !own ? 'text' : 'contained'} onClick={onClose}>{t('Close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const t = useT();
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
  const approve = async (tpl) => {
    try {
      done((await templatesApi.approve(tpl.id)).message);
    } catch (err) {
      setViewing(null);
      setError(apiError(err).message);
    }
  };
  const openEdit = async (tpl) => {
    setViewing(null);
    setEditing(tpl.body !== undefined ? tpl : await templatesApi.get(tpl.id));
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Agreement templates')}</h1>
          <p>{t('The Legal Officer uploads and edits versions; the Head of Legal approves them. Only approved versions are used, and each loan keeps the version its staff member accepted.')}</p>
        </div>
        {canEdit && <Button variant="contained" onClick={() => setEditing(null)}>{t('Upload new version')}</Button>}
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {data?.items.some((x) => x.state === 'current' && x.sample) && (
        <Alert severity="warning" sx={{ mb: 2 }}>{t("The version in use holds the prototype's sample clauses. Upload the Legal-approved Mkataba before go-live.")}</Alert>
      )}
      <Card>
        <div className="tablewrap">
          <Table aria-label={t('Agreement versions')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Version')}</TableCell>
                <TableCell>{t('Status')}</TableCell>
                <TableCell>{t('Used from')}</TableCell>
                <TableCell>{t('Uploaded')}</TableCell>
                <TableCell>{t('Legal decision')}</TableCell>
                <TableCell>{t('Notes')}</TableCell>
                <TableCell align="right">{t('Agreements')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((v) => {
                const [label, color] = STATE[v.state] || [v.statusLabel, 'default'];
                return (
                  <TableRow key={v.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{v.version}{v.sample && <span className="tag" style={{ marginLeft: 6 }}>{t('Sample')}</span>}</TableCell>
                    <TableCell><Chip size="small" color={color} label={t(label)} /></TableCell>
                    <TableCell>{formatDate(v.effectiveFrom)}</TableCell>
                    <TableCell>{formatDate(v.loadedAt)}{v.loadedBy ? `, ${v.loadedBy}` : ''}</TableCell>
                    <TableCell className="small">
                      {v.approvedAt && (v.approvedBy ? t('Approved {date} by {name}', { date: formatDate(v.approvedAt), name: v.approvedBy }) : t('Approved {date}', { date: formatDate(v.approvedAt) }))}
                      {v.rejectedAt && `${v.rejectedBy ? t('Rejected {date} by {name}', { date: formatDate(v.rejectedAt), name: v.rejectedBy }) : t('Rejected {date}', { date: formatDate(v.rejectedAt) })}: ${v.rejectionReason}`}
                      {!v.approvedAt && !v.rejectedAt && '—'}
                    </TableCell>
                    <TableCell className="small">{v.note}</TableCell>
                    <TableCell align="right" className="num">{v.agreements}</TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => setViewing(v.id)}>{v.status === 'pending_legal_approval' && canApprove && !v.editorIds.includes(myId) ? t('Review') : t('View')}</Button></TableCell>
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
          onReject={(tpl) => {
            setViewing(null);
            setRejecting(tpl);
          }}
        />
      )}
      {rejecting && <RejectDialog version={rejecting.version} onClose={() => setRejecting(null)} onReject={async (reason) => done((await templatesApi.reject(rejecting.id, reason)).message)} />}
    </div>
  );
}
