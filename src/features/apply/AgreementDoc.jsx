// Renders the agreement blocks from the API exactly as rendered on the server, with
// filled-in values highlighted (prototype .doc .fill). The server hashes the same text.

import { forwardRef } from 'react';
import s from './apply.module.css';
import { useT } from '../../i18n';

function Parts({ parts }) {
  return parts.map((p, i) => {
    // A strong part (the Employee's name in the parties) is bold, as in the signed PDF.
    const text = p.strong ? <b>{p.text}</b> : p.text;
    return p.fill ? (
      // eslint-disable-next-line react/no-array-index-key
      <span key={i} className={s.fill}>{text}</span>
    ) : (
      // eslint-disable-next-line react/no-array-index-key
      <span key={i}>{text}</span>
    );
  });
}

const AgreementDoc = forwardRef(function AgreementDoc({ blocks, onScroll, open, lang = 'sw' }, ref) {
  const t = useT();
  return (
    <div ref={ref} className={`${s.doc} ${open ? s.docOpen : ''}`} tabIndex={0} onScroll={onScroll} aria-label={t('Loan agreement text')} lang={lang}>
      {blocks.map((b, i) => {
        const key = `${b.type}${i}`;
        if (b.type === 'h1') return <h3 key={key}><Parts parts={b.parts} /></h3>;
        if (b.type === 'h2') return <h4 key={key}><Parts parts={b.parts} /></h4>;
        if (b.type === 'note') return <p key={key} className={s.note}><Parts parts={b.parts} /></p>;
        if (b.type === 'p') return <p key={key}><Parts parts={b.parts} /></p>;
        // Ticked in the signing panel; shown here as the statements the agreement contains.
        if (b.type === 'declaration') return <p key={key} className={s.decl}><span aria-hidden="true">☐ </span><Parts parts={b.parts} /></p>;
        if (b.type === 'ol' || b.type === 'ul') {
          const List = b.type;
          return (
            <List key={key} style={b.type === 'ul' ? { listStyle: 'none', paddingLeft: 0 } : undefined}>
              {b.items.map((it, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={j}><Parts parts={it} /></li>
              ))}
            </List>
          );
        }
        if (b.type === 'table') {
          return (
            <div key={key} style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {b.rows.map((r) => (
                    <tr key={r[0]}>{r.map((c, j) => <td key={`${r[0]}-${j}`}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});

export default AgreementDoc;

/** Turns stored agreement text (one line per block) into simple blocks for read-only display. */
export function textToBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('\t')) {
      const head = line.split('\t');
      const rows = [];
      while (lines[i + 1] && lines[i + 1].includes('\t')) {
        i += 1;
        rows.push(lines[i].split('\t'));
      }
      blocks.push({ type: 'table', head, rows });
    } else if (/^\d+\. /.test(line)) {
      const prev = blocks.at(-1);
      const item = [{ text: line.replace(/^\d+\. /, '') }];
      if (prev?.type === 'ol') prev.items.push(item);
      else blocks.push({ type: 'ol', items: [item] });
    } else if (line.startsWith('- ')) {
      const prev = blocks.at(-1);
      const item = [{ text: line.slice(2) }];
      if (prev?.type === 'ul') prev.items.push(item);
      else blocks.push({ type: 'ul', items: [item] });
    } else if (line.startsWith('[ ] ')) blocks.push({ type: 'declaration', parts: [{ text: line.slice(4) }] });
    else if (i === 0) blocks.push({ type: 'h1', parts: [{ text: line }] });
    else blocks.push({ type: 'p', parts: [{ text: line }] });
  }
  return blocks;
}

/** The statements the agreement asks the staff member to tick, in order. */
export const declarationsOf = (blocks) => (blocks || []).filter((b) => b.type === 'declaration').map((b) => b.parts.map((p) => p.text).join(''));

/** One tick box per declaration of the agreement, worded exactly as in it. */
export function DeclarationChecks({ items, ticks, onChange, lang }) {
  return items.map((text, i) => (
    // eslint-disable-next-line react/no-array-index-key
    <label key={i} className={s.check}>
      <input type="checkbox" checked={!!ticks[i]} onChange={(e) => onChange(ticks.map((v, j) => (j === i ? e.target.checked : v)))} />
      <span lang={lang}>{text}</span>
    </label>
  ));
}

// The agreement's own acceptance line, in the agreement's language (D-109).
export const ACCEPT_LINE = {
  sw: 'Nimesoma, nimeelewa na kukubali vifungu vyote vya mkataba huu.',
  en: 'I have read, understood and accept all the terms of this agreement.',
};
