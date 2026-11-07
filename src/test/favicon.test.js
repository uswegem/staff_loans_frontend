import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const linked = [...html.matchAll(/<link[^>]+href="\/([^"]+)"/g)].map((m) => m[1]);

describe('favicon and web app manifest', () => {
  it('links the icon set and the manifest', () => {
    expect(linked).toEqual(expect.arrayContaining(['favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'site.webmanifest']));
  });

  it('every linked file and manifest icon exists in public/', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/site.webmanifest'), 'utf8'));
    const files = [...linked, ...manifest.icons.map((i) => i.src.replace(/^\//, ''))];
    for (const f of files) expect(existsSync(resolve(root, 'public', f)), f).toBe(true);
  });

  it('no longer uses the old wide wordmark as the tab icon', () => {
    expect(linked).not.toContain('favicon.png');
  });
});
