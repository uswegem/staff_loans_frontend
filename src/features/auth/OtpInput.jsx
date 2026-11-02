import { useRef } from 'react';
import s from './SignIn.module.css';
import { useT } from '../../i18n';

/** Six one-digit boxes; typing or pasting moves focus along (prototype .otp). */
export default function OtpInput({ value, onChange, invalid, describedBy }) {
  const t = useT();
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const set = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(''));
  };

  const onInput = (i, e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (v.length > 1) {
      onChange(v.slice(0, 6));
      refs.current[Math.min(v.length, 5)]?.focus();
      return;
    }
    set(i, v);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className={`${s.otp} ${invalid ? s.otpInvalid : ''}`} role="group" aria-label={t('6-digit code')} aria-describedby={describedBy}>
      {digits.map((d, i) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`otp${i}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={d}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
