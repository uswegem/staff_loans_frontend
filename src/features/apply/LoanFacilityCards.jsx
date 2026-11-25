// Apply, step 1: the loan facilities as selectable cards (a WAI-ARIA radio group with roving
// focus). Each card: product icon, selection check, product name, rate pill, five
// specification rows, divider, eligibility note. Arrow keys move between the loans that can
// be chosen; Space, Enter or a click chooses one, which marks it selected and starts the
// application, as before.

import { useRef, useState } from 'react';
import LoanIcon from '../../components/icons/LoanIcons';
import { facilitySpecs, ratePill } from './facilitySpecs';
import { useT } from '../../i18n';
import s from './apply.module.css';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export default function LoanFacilityCards({ products, pricing, reasonFor, openFor, selected, busy, onChoose }) {
  const t = useT();
  const refs = useRef({});
  const enabled = products.filter((p) => !reasonFor(p));
  const [focusId, setFocusId] = useState(null);
  const tabStop = selected || (enabled.some((p) => p.id === focusId) ? focusId : enabled[0]?.id);
  const pill = ratePill(pricing, t);

  const move = (from, step) => {
    if (!enabled.length) return;
    const i = enabled.findIndex((p) => p.id === from);
    const next = enabled[(i + step + enabled.length) % enabled.length];
    setFocusId(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e, p) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); move(p.id, 1); }
    else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); move(p.id, -1); }
    else if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!busy && !reasonFor(p)) onChoose(p); }
  };

  return (
    <div role="radiogroup" aria-label={t('Choose a loan')} className={s.prods}>
      {products.map((p) => {
        const reason = reasonFor(p);
        const disabled = !!reason || busy;
        const checked = selected === p.id;
        const rows = facilitySpecs(p, pricing, t);
        return (
          <div
            key={p.id}
            ref={(el) => { refs.current[p.id] = el; }}
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled}
            aria-busy={checked && busy ? true : undefined}
            aria-describedby={reason ? `why_${p.id}` : undefined}
            tabIndex={!reason && p.id === tabStop ? 0 : -1}
            className={`${s.prod} ${checked ? s.prodOn : ''}`}
            onClick={() => !disabled && onChoose(p)}
            onKeyDown={(e) => onKeyDown(e, p)}
            onFocus={() => setFocusId(p.id)}
          >
            <div className={s.prodHead}>
              <span className={s.badge}><LoanIcon product={p} className={s.badgeIcon} /></span>
              <span className={s.pick} aria-hidden="true">{checked && <CheckIcon />}</span>
            </div>
            <h3 className={s.prodName}>{p.name}</h3>
            {pill && (
              <div className={s.ratePill}>
                {t('Rate')} <b>{pill.rate}</b> <span>({pill.method})</span>
              </div>
            )}
            {rows.length > 0 && (
              <dl className={s.specs}>
                {rows.map((r) => (
                  <div key={r.key} className={r.strong ? s.specStrong : undefined}>
                    <dt>{r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {reason && (openFor(p)
              ? <span id={`why_${p.id}`} className={`tag ${s.reasonTag}`}>{reason}</span>
              : <span id={`why_${p.id}`} className={s.reason}>{reason}</span>)}
            <p className={s.eligibility}>{t('Your maximum eligibility is calculated after payslip upload.')}</p>
          </div>
        );
      })}
    </div>
  );
}
