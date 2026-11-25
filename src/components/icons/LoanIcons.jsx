// Loan facility icons, drawn like the app's other inline icons (24-unit grid, stroke in the
// current colour). Decorative: the card names the product in text.

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', focusable: 'false', 'aria-hidden': 'true' };

const ICONS = {
  // Front-facing car.
  car: (
    <>
      <path d="M5 11l1.6-4.3A2 2 0 0 1 8.5 5.4h7a2 2 0 0 1 1.9 1.3L19 11" />
      <path d="M4 11h16a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1z" />
      <path d="M5.5 17.5v1.6M18.5 17.5v1.6" />
      <circle cx="7" cy="14.2" r="1" />
      <circle cx="17" cy="14.2" r="1" />
      <path d="M10 14.2h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18V7.5z" />
      <path d="M4 7.5 15.5 4.6a1 1 0 0 1 1.2 1V7.5" />
      <path d="M20 11.5h-4a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  house: (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  graduation: (
    <>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9z" />
      <path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11" />
      <path d="M21.5 9v5" />
    </>
  ),
  heartPulse: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
      <path d="M5.5 12.5h3.2l1.5-2.5 2.2 4.5 1.5-2h3.6" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 17.5h2" />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M3 18.5h18l-1.5-3.5h-15L3 18.5z" />
    </>
  ),
  banknote: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  // Generic loan facility: a document with a currency mark.
  generic: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5z" />
      <path d="M14 3.5V7.5h4" />
      <path d="M12 10v7M14 11.5h-2.6a1.2 1.2 0 0 0 0 2.4h1.2a1.2 1.2 0 0 1 0 2.4H10" />
    </>
  ),
};

/**
 * The icon for a product: a configured icon key when the product has one, then its code,
 * then its name, then the generic facility icon. Words are matched on their own in names
 * ("Car Loan") and anywhere in codes ("CARLOAN"); the first match in this order wins.
 */
const RULES = [
  ['car', ['car', 'vehicle', 'motor', 'auto']],
  ['house', ['house', 'housing', 'home', 'mortgage', 'construction']],
  ['graduation', ['education', 'school', 'tuition', 'study', 'university']],
  ['heartPulse', ['medical', 'health', 'hospital']],
  ['smartphone', ['device', 'phone', 'smartphone', 'mobile']],
  ['laptop', ['computer', 'laptop']],
  ['banknote', ['advance', 'salary advance']],
  ['wallet', ['personal']],
];

export function loanIconKey(product = {}) {
  if (product.icon && ICONS[product.icon]) return product.icon;
  const code = String(product.code || '').toLowerCase();
  const name = String(product.name || '').toLowerCase();
  for (const [key, words] of RULES) {
    if (code.length > 2 && words.some((w) => code.includes(w.replace(/\s+/g, '')))) return key;
  }
  for (const [key, words] of RULES) {
    if (words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(name))) return key;
  }
  return 'generic';
}

/** The product's icon; size is the drawn size in pixels (the container sets the box). */
export default function LoanIcon({ product, size = 44, className }) {
  const key = loanIconKey(product);
  return (
    <svg {...base} width={size} height={size} className={className} data-icon={key}>
      {ICONS[key]}
    </svg>
  );
}
