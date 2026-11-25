// Application statuses (BRD 7.4) with prototype tones. Labels match the API and are
// shown in the chosen language (D-94).

import { translate } from '../i18n';

export const STATUS = {
  draft: ['Draft', 'default'],
  pending_credit: ['Pending Credit Review', 'info'],
  pending_pcm: ['Pending P&C Manager Review', 'info'],
  pending_hr: ['Pending HR Review', 'info'],
  // D-103: the P&C Manager or the Head of P&C decides.
  pending_pc: ['Pending People and Culture Review', 'info'],
  pending_ceo: ['Pending CEO Approval', 'info'],
  returned: ['Returned for Correction', 'warning'],
  rejected: ['Rejected', 'error'],
  pending_reaccept: ['Approved – Revised Terms to Accept', 'warning'],
  declined: ['Declined by Applicant', 'error'],
  pending_booking: ['Pending Booking', 'info'],
  pending_disbursement: ['Pending Disbursement', 'info'],
  disbursed: ['Disbursed', 'success'],
  withdrawn: ['Withdrawn', 'default'],
};

export const OPEN = ['draft', 'pending_credit', 'pending_pcm', 'pending_hr', 'pending_pc', 'pending_ceo', 'returned', 'pending_reaccept', 'pending_booking', 'pending_disbursement'];

/** The label for a status key in the chosen language; the API's own label is the fallback. */
export const statusLabel = (s, fallback) => translate(STATUS[s]?.[0] || fallback || s);
