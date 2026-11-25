// Renders the agreement blocks from the API exactly as rendered on the server, with
// filled-in values highlighted (prototype .doc .fill). The server hashes the same text.
// D-110: the same layout as the PDF: the LFB letterhead, section and clause numbers in their
// own column (wrapped lines align with the clause text), lettered sub-clauses one level in,
// and the Loan Details as a two-column table. Agreements signed before keep their schedule.

import { forwardRef } from 'react';
import s from './apply.module.css';
import { useT } from '../../i18n';
import logo from '../../assets/lfb-logo.png';

// The bank's legal name and address, in the agreement's language (as on the PDF).
const BANK = {
  name: 'Letshego Faidika Bank Limited',
  address: { en: ['P.O. Box 34459, Dar es Salaam', 'United Republic of Tanzania'], sw: ['S.L.P. 34459, Dar es Salaam', 'Jamhuri ya Muungano wa Tanzania'] },
};

function Parts({ parts }) {
  return parts.map((p, i) => {
    // A strong part (the Employee's name, a defined term, a clause heading) is bold, as in the PDF.
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
  const language = lang === 'en' ? 'en' : 'sw';
  return (
    <div ref={ref} className={`${s.doc} ${open ? s.docOpen : ''}`} tabIndex={0} onScroll={onScroll} aria-label={t('Loan agreement text')} lang={lang}>
      <div className={s.letterhead} data-testid="agreement-letterhead">
        <img src={logo} alt="Letshego Faidika Bank" />
        <div>
          <b>{BANK.name}</b>
          {BANK.address[language].map((l) => <span key={l}>{l}</span>)}
        </div>
      </div>
      {blocks.map((b, i) => {
        const key = `${b.type}${i}`;
        if (b.type === 'h1') return <h3 key={key}><Parts parts={b.parts} /></h3>;
        if (b.type === 'h2') {
          return b.number
            ? <h4 key={key} className={s.numbered}><span className={s.num}>{b.number}</span><span><Parts parts={b.parts} /></span></h4>
            : <h4 key={key}><Parts parts={b.parts} /></h4>;
        }
        if (b.type === 'clause') return <p key={key} className={s.numbered}><span className={s.num}>{b.number}</span><span><Parts parts={b.parts} /></span></p>;
        if (b.type === 'sub') return <p key={key} className={`${s.numbered} ${s.sub}`}><span className={s.num}>{b.number}</span><span><Parts parts={b.parts} /></span></p>;
        if (b.type === 'note') return <p key={key} className={s.note}><Parts parts={b.parts} /></p>;
        if (b.type === 'p') return <p key={key}><Parts parts={b.parts} /></p>;
        // Ticked in the signing panel; shown here as the statements the agreement contains.
        if (b.type === 'declaration') return <p key={key} className={s.decl}><span aria-hidden="true">☐ </span><Parts parts={b.parts} /></p>;
        if (b.type === 'details') {
          return (
            <table key={key} className={s.details}>
              <tbody>
                {b.rows.map((r, j) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={j}><th scope="row"><Parts parts={r.label} /></th><td><Parts parts={r.value} /></td></tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (b.type === 'ol' || b.type === 'ul') {
          const List = b.type;
          return (
            <List key={key} className={b.level ? s.underClause : undefined} style={b.type === 'ul' && !b.level ? { listStyle: 'none', paddingLeft: 0 } : undefined}>
              {b.items.map((it, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={j}><Parts parts={it} /></li>
              ))}
            </List>
          );
        }
        if (b.type === 'table') {
          // The repayment schedule of an agreement signed before D-110, kept as signed.
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

/**
 * Turns stored agreement text into blocks for read-only display, for agreements whose blocks
 * were not kept. format 2 (D-110): the text carries its structure ("## 1. HEADING", "1.2 ...",
 * "  (a) ...", "| Label | Value"); format 1: one line per block.
 */
export function textToBlocks(text, format = 1) {
  const blocks = [];
  const lines = text.split('\n');
  const push = (type, item, extra = {}) => {
    const prev = blocks.at(-1);
    if (prev?.type === type && prev.level === extra.level) prev.items.push(item);
    else blocks.push({ type, items: [item], ...extra });
  };
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
      continue;
    }
    if (format === 2) {
      let m;
      if (line.startsWith('# ')) blocks.push({ type: 'h1', parts: [{ text: line.slice(2) }] });
      else if (line.startsWith('~ ')) blocks.push({ type: 'note', parts: [{ text: line.slice(2) }] });
      else if (line.startsWith('##* ')) blocks.push({ type: 'h2', number: null, parts: [{ text: line.slice(4) }] });
      else if ((m = line.match(/^## (\d+\.) (.*)$/))) blocks.push({ type: 'h2', number: m[1], parts: [{ text: m[2] }] });
      else if ((m = line.match(/^(\d+\.\d+) (.*)$/))) blocks.push({ type: 'clause', number: m[1], parts: [{ text: m[2] }] });
      else if ((m = line.match(/^ {2}(\([a-z]+\)) (.*)$/))) blocks.push({ type: 'sub', number: m[1], parts: [{ text: m[2] }] });
      else if ((m = line.match(/^( *)- (.*)$/))) push('ul', [{ text: m[2] }], { level: m[1].length / 2 });
      else if ((m = line.match(/^\| (.*?) \| (.*)$/))) {
        const prev = blocks.at(-1);
        const row = { label: [{ text: m[1] }], value: [{ text: m[2] }] };
        if (prev?.type === 'details') prev.rows.push(row);
        else blocks.push({ type: 'details', rows: [row] });
      } else if (line.startsWith('[ ] ')) blocks.push({ type: 'declaration', parts: [{ text: line.slice(4) }] });
      else blocks.push({ type: 'p', parts: [{ text: line }] });
      continue;
    }
    if (/^\d+\. /.test(line)) push('ol', [{ text: line.replace(/^\d+\. /, '') }]);
    else if (line.startsWith('- ')) push('ul', [{ text: line.slice(2) }]);
    else if (line.startsWith('[ ] ')) blocks.push({ type: 'declaration', parts: [{ text: line.slice(4) }] });
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
