import { describe, expect, it } from 'vitest';
import { safePath } from './safePath';

const BACKSLASH = String.fromCharCode(92);

describe('safePath', () => {
  it('keeps in-app paths', () => {
    expect(safePath('/applications/64f0c0ffee')).toBe('/applications/64f0c0ffee');
    expect(safePath('/disburse')).toBe('/disburse');
  });

  it('refuses anything that could leave the app', () => {
    const bad = ['//evil.example', `/${BACKSLASH}evil.example`, `${BACKSLASH}${BACKSLASH}evil.example`, 'https://evil.example', 'javascript:alert(1)', `/a${BACKSLASH}b`, '/a b', '', null, undefined, 42];
    bad.forEach((v) => expect(safePath(v)).toBe('/'));
  });
});
