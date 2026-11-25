import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import SW from './sw';
import { STATUS } from '../lib/statuses';
import { NAV } from '../components/nav';

// D-109: one language at a time. Every English text the interface passes to t() or
// translate() has a Swahili entry, and every entry is complete in both languages. This
// fails CI when interface text is added in English only.

const ROOT = join(__dirname, '..');
const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return files(p);
  return /\.(jsx?|js)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
});
const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
const names = (text) => (text.match(/\{\w+\}/g) || []).sort().join(',');

describe('i18n coverage (D-109)', () => {
  it('every text passed to t() or translate() has a Swahili entry', () => {
    const missing = files(ROOT).flatMap((f) => {
      if (f.endsWith(join('i18n', 'index.jsx'))) return [];
      const src = readFileSync(f, 'utf8');
      return [...src.matchAll(/\b(?:t|translate)\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/g)]
        .map((m) => unescape(m[2]))
        .filter((k) => !(k in SW))
        .map((k) => `${relative(ROOT, f)}: ${k}`);
    });
    expect([...new Set(missing)]).toEqual([]);
  });

  it('status labels and menu items have Swahili entries', () => {
    const labels = [...Object.values(STATUS).map(([label]) => label), ...NAV.flatMap((g) => [g.group, ...g.items.map((i) => i.label)])];
    expect(labels.filter((l) => !(l in SW))).toEqual([]);
  });

  it('every entry has both languages and the same placeholders', () => {
    const bad = Object.entries(SW).filter(([en, sw]) => !en.trim() || typeof sw !== 'string' || !sw.trim() || names(en) !== names(sw));
    expect(bad).toEqual([]);
  });
});
