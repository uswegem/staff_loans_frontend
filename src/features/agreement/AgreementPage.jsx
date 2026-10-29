// A signed agreement, read-only (prototype #/agreement/:id; FR-25, FR-35, FR-37):
// status, the exact text accepted, the acceptance evidence and the locked PDF.

import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, Link } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDateTime } from '../../lib/format';
import AgreementDoc, { textToBlocks } from '../apply/AgreementDoc';
import s from '../apply/apply.module.css';

const STATE = { signed: ['Signed, awaiting approval', 'default'], in_force: ['In force', 'success'], void: ['Void', 'error'] };

export default function AgreementPage() {
  const { id } = useParams();
  const [ag, setAg] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    applicationsApi.agreement(id).then(setAg).catch((e) => setError(apiError(e).message));
  }, [id]);

  if (error && !ag) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!ag) return <p className="muted" role="status">Loading…</p>;
  const [label, tone] = STATE[ag.status];

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to={`/applications/${ag.applicationId}`} color="inherit">{ag.ref}</Link> / Agreement</div>
      <div className="pagehead">
        <div>
          <h1>Agreement {ag.number}</h1>
          <p><Chip size="small" color={tone} label={label} /> {ag.voidReason ? ag.voidReason : ''}</p>
        </div>
        <Button variant="contained" onClick={() => downloadFile(`/agreements/${ag.id}/pdf`, `${ag.number}.pdf`).catch((e) => setError(apiError(e).message))}>Download PDF</Button>
      </div>
      <div className={s.split}>
        <AgreementDoc blocks={textToBlocks(ag.text)} open />
        <Card className={s.sticky}>
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: 12 }}>Acceptance evidence</h3>
            <dl className={s.kv}>
              <dt>Signed by</dt><dd>{ag.acceptance.fullName} ({ag.acceptance.staffNo})</dd>
              <dt>When</dt><dd>{formatDateTime(ag.acceptance.at)}</dd>
              <dt>IP address</dt><dd>{ag.acceptance.ip}</dd>
              <dt>Template</dt><dd>{ag.templateVersion}</dd>
              <dt>Fingerprint</dt><dd style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}>{ag.textSha256}</dd>
              {ag.effectiveAt && (<><dt>In force from</dt><dd>{formatDateTime(ag.effectiveAt)}</dd></>)}
              {ag.voidAt && (<><dt>Void since</dt><dd>{formatDateTime(ag.voidAt)}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
