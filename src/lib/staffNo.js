// Staff numbers are Payroll's employee codes, as printed on the payslip (for example
// AT637). Same rule as the API (constants/staffNo.js, DECISIONS C-07).

export const STAFF_NO = /^[A-Z][A-Z0-9]{1,11}$/;
export const STAFF_NO_MESSAGE = 'Enter your staff number as on your payslip (employee code), for example AT637.';
export const STAFF_NO_EXAMPLE = 'AT637';
