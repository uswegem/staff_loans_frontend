// Application statuses (BRD 7.4) with prototype tones. Labels match the API.

export const STATUS = {
  draft: ['Draft', 'default'],
  pending_credit: ['Pending Credit Review', 'info'],
  pending_pcm: ['Pending P&C Manager Review', 'info'],
  pending_hr: ['Pending HR Review', 'info'],
  pending_ceo: ['Pending CEO Approval', 'info'],
  returned: ['Returned for Correction', 'warning'],
  rejected: ['Rejected', 'error'],
  pending_reaccept: ['Approved – Revised Terms to Accept', 'warning'],
  declined: ['Declined by Applicant', 'error'],
  pending_disbursement: ['Pending Disbursement', 'info'],
  disbursed: ['Disbursed', 'success'],
  withdrawn: ['Withdrawn', 'default'],
};

export const OPEN = ['draft', 'pending_credit', 'pending_pcm', 'pending_hr', 'pending_ceo', 'returned', 'pending_reaccept', 'pending_disbursement'];

export const statusLabel = (s) => (STATUS[s] || [s])[0];
