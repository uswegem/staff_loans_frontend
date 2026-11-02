// What still stops a staff member with a complete profile from applying (D-97): a date
// of birth People and Culture have not verified, or no employment record or salary on
// file. The messages come from the API, already in the chosen language.

import { Alert, AlertTitle } from '@mui/material';
import { useT } from '../i18n';

export default function ApplyBlockers({ blockers }) {
  const t = useT();
  if (!blockers?.length) return null;
  return (
    <Alert severity="info">
      <AlertTitle>{t('You cannot apply for a loan yet')}</AlertTitle>
      {blockers.length === 1 ? (
        blockers[0]
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
    </Alert>
  );
}
