// D-110: the repayment schedule is not part of the agreement. Operations (disb.confirm) and
// the Credit department (review.credit, products.approveCredit) give it on request for an
// approved or disbursed loan. The API refuses the applicant and audits every download.

import { useSelector } from 'react-redux';
import { Button } from '@mui/material';
import { downloadFile } from '../api/staff';
import { apiError } from '../api/client';
import { useT } from '../i18n';

const ROLES = ['disb.confirm', 'review.credit', 'products.approveCredit'];
const APPROVED = ['pending_booking', 'pending_disbursement', 'disbursed'];

export default function ScheduleDownload({ id, reference, status, applicantUserId, onError, size = 'medium' }) {
  const t = useT();
  const auth = useSelector((st) => st.auth);
  const can = ROLES.some((p) => (auth.permissions || []).includes(p));
  if (!can || !APPROVED.includes(status) || (applicantUserId && String(applicantUserId) === String(auth.user?.id))) return null;
  const go = () => downloadFile(`/applications/${id}/repayment-schedule.pdf`, `repayment-schedule-${reference}.pdf`).catch((e) => onError?.(apiError(e).message));
  return <Button size={size} onClick={go}>{t('Download repayment schedule')}</Button>;
}
