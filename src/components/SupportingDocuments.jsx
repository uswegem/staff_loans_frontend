// Supporting documents: the full table for reviewers and Operations, and FileList for the
// applicant, who sees each file once, under the requirement it was added for.
import { useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { api } from '../api/client';
import { downloadFile } from '../api/staff';
import { apiError } from '../api/client';
import { formatDateTime } from '../lib/format';
import { useT } from '../i18n';

/** Preview (fetched with the normal bearer-token API; no public file URL is exposed) and download. */
function useFileActions() {
  const t = useT();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  const openPreview = async (doc) => {
    setLoading(doc.id);
    setError(null);
    try {
      const result = await api.get(`/files/${doc.id}`, { params: { preview: '1' }, responseType: 'blob' });
      const url = URL.createObjectURL(result.data);
      setPreview((old) => {
        if (old?.url) URL.revokeObjectURL(old.url);
        return { url, mime: doc.mime, name: doc.originalName };
      });
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(null);
    }
  };
  const download = async (doc) => {
    try {
      setError(null);
      await downloadFile(`/files/${doc.id}`, doc.originalName);
    } catch (err) {
      setError(apiError(err).message);
    }
  };
  const dialog = (
    <Dialog open={!!preview} onClose={closePreview} fullWidth maxWidth="lg">
      <DialogTitle>{preview?.name}</DialogTitle>
      <DialogContent>
        {preview && (preview.mime?.startsWith('image/') ? (
          <img src={preview.url} alt={preview.name} style={{ maxWidth: '100%', display: 'block', margin: 'auto' }} />
        ) : (
          <iframe src={preview.url} title={preview.name} style={{ width: '100%', height: '65vh', border: 0 }} />
        ))}
      </DialogContent>
      <DialogActions><Button onClick={closePreview}>{t('Close')}</Button></DialogActions>
    </Dialog>
  );
  return { openPreview, download, loading, error, dialog };
}

/** The applicant's own files for one requirement: one line each with Preview, Download and Remove. */
export function FileList({ files = [], onRemove = null }) {
  const t = useT();
  const { openPreview, download, loading, error, dialog } = useFileActions();
  if (!files.length) return null;
  return (
    <div>
      {error && <Alert severity="error" sx={{ mb: 1 }} role="alert">{error}</Alert>}
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }} aria-label={t('Files added')}>
        {files.map((d) => (
          <li key={d.id} className="row" style={{ justifyContent: 'space-between', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line-2)' }}>
            <span className="small">{d.originalName}</span>
            <span className="row" style={{ gap: 8 }}>
              <Button size="small" variant="text" disabled={loading === d.id} onClick={() => openPreview(d)}>{t('Preview')}</Button>
              <Link component="button" type="button" className="small" onClick={() => download(d)}>{t('Download')}</Link>
              {onRemove && <Button size="small" variant="text" color="error" onClick={() => onRemove(d)}>{t('Remove')}</Button>}
            </span>
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  );
}

/** Reviewers and Operations: the checklist and every file with who uploaded it and when. */
export default function SupportingDocuments({ documents = [], documentChecklist = [], onRemove = null }) {
  const t = useT();
  const { openPreview, download, loading, error, dialog } = useFileActions();
  const names = new Map(documentChecklist.map((d) => [d.code, d.name]));
  const missing = documentChecklist.filter((d) => d.mandatory && d.uploaded < d.minFiles);
  return (
    <div>
      {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
      {missing.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{t('Missing mandatory documents')}: {missing.map((d) => d.name).join(', ')}</Alert>}
      {documentChecklist.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {documentChecklist.map((d) => (
            <div key={d.code} className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
              <span>{d.name} {d.mandatory ? '*' : `(${t('Optional')})`}</span>
              <Chip size="small" color={d.uploaded >= d.minFiles ? 'success' : 'warning'} label={`${d.uploaded} / ${d.minFiles}`} />
            </div>
          ))}
        </div>
      )}
      {documents.length ? (
        <div className="tablewrap">
          <Table size="small" aria-label={t('Supporting documents')}>
            <TableHead><TableRow><TableCell>{t('Category')}</TableCell><TableCell>{t('File')}</TableCell><TableCell>{t('Uploaded')}</TableCell><TableCell>{t('Uploaded by')}</TableCell><TableCell>{t('Actions')}</TableCell></TableRow></TableHead>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{names.get(d.documentCode) || d.label || t('Other supporting document')}</TableCell>
                  <TableCell>{d.originalName}</TableCell>
                  <TableCell>{d.uploadedAt ? formatDateTime(d.uploadedAt) : '—'}</TableCell>
                  <TableCell>{d.uploadedBy || '—'}</TableCell>
                  <TableCell>
                    <div className="row" style={{ gap: 8 }}>
                      <Button size="small" disabled={loading === d.id} onClick={() => openPreview(d)}>{t('Preview')}</Button>
                      <Link component="button" type="button" onClick={() => download(d)}>{t('Download')}</Link>
                      {onRemove && <Button size="small" color="error" onClick={() => onRemove(d)}>{t('Remove')}</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : <p className="small muted">{t('No supporting documents attached.')}</p>}
      {dialog}
    </div>
  );
}
