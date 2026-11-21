import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import SW from './sw';
import { translate, withoutCodes } from './index';

// Requirement and decision codes belong in comments, never in text people read (UX review #10).
const CODE = /\((?:[^()]*\b)?(?:D|BR|FR|NFR|NS|RP)-\d+/;
const ROOT = join(__dirname, '..');

const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return files(p);
  return /\.(jsx?|js)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
});

describe('no internal codes in interface text', () => {
  it('English and Swahili pairs', () => {
    const found = Object.entries(SW).filter(([en, sw]) => CODE.test(en) || CODE.test(sw));
    expect(found).toEqual([]);
  });

  it('text passed to t() in the code', () => {
    const found = files(ROOT).flatMap((f) => {
      const src = readFileSync(f, 'utf8');
      return [...src.matchAll(/\bt\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)].filter((m) => CODE.test(m[2])).map((m) => `${relative(ROOT, f)}: ${m[2]}`);
    });
    expect(found).toEqual([]);
  });

  it('codes in text saved earlier are dropped when shown', () => {
    expect(withoutCodes('Approves or rejects agreement templates (D-88).')).toBe('Approves or rejects agreement templates.');
    expect(withoutCodes('without two separate approvals (BRD 5.1, D-89). A maker')).toBe('without two separate approvals. A maker');
    expect(translate('Applied during probation: verify the reason (NS-01).', undefined, 'sw')).toBe('Ameomba akiwa kwenye matazamio: thibitisha sababu.');
    expect(withoutCodes('Mobile (optional)')).toBe('Mobile (optional)');
  });
});
