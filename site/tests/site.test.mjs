import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { parseContentUpdates } from '../src/lib/github-info.js';

test('repository updates preserve source links and real dates', () => {
  const updates = parseContentUpdates(`
# GitHub Info

## Latest GitHub Updates

### A linked update

GitHub released an update for developers.

- It includes a useful improvement.

> *Source: [GitHub Changelog · April 2, 2026](https://github.blog/changelog/example/)*

## Editorial note

This repository note has no publication date.
`);

  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0], {
    type: 'From github-info.md',
    date: 'April 2, 2026',
    section: 'Latest GitHub Updates',
    title: 'A linked update',
    summary: 'GitHub released an update for developers.',
    href: 'https://github.blog/changelog/example/',
    bullets: ['It includes a useful improvement.'],
    sourceLabel: 'GitHub Changelog · April 2, 2026',
  });
  assert.equal(updates[1].date, '');
  assert.equal(updates[1].href, '#content-sources');
});

test('built page prefixes public assets with the configured base path', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const rootRelativeReferences = [...html.matchAll(/\b(?:href|src)="(\/[^"]+)"/g)]
    .map((match) => match[1]);

  assert.ok(rootRelativeReferences.length > 0);
  for (const reference of rootRelativeReferences) {
    assert.ok(
      reference.startsWith('/Gareth/'),
      `Expected ${reference} to start with the deployed base path`,
    );
  }
});

test('fragment links stay in the current browser tab', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const fragmentLinks = [...html.matchAll(/<a\b[^>]*\bhref="#[^"]*"[^>]*>/g)]
    .map((match) => match[0]);

  assert.ok(fragmentLinks.length > 0);
  for (const link of fragmentLinks) {
    assert.doesNotMatch(link, /\btarget="_blank"/);
  }
});
