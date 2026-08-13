import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractDateFromText,
  parseGithubInfoMarkdown,
  parseSourceLine,
} from './github-info.js';

test('parses quoted and emphasized source lines with links', () => {
  assert.deepEqual(
    parseSourceLine(
      '  > **Source:** [GitHub Changelog · 2026-03-17](https://github.blog/changelog/example/)'
    ),
    {
      label: 'GitHub Changelog · 2026-03-17',
      href: 'https://github.blog/changelog/example/',
    }
  );

  assert.deepEqual(
    parseSourceLine(' Source: GitHub Blog · https://github.blog/example/'),
    {
      label: 'GitHub Blog',
      href: 'https://github.blog/example/',
    }
  );
});

test('formats valid ISO dates and rejects invalid ones', () => {
  assert.equal(extractDateFromText('Published 2026-03-17'), 'March 17, 2026');
  assert.equal(extractDateFromText('Published 2026-02-31'), '');
});

test('uses source dates and links for generated update cards', () => {
  const updates = parseGithubInfoMarkdown(
    `# GitHub Info

## Latest GitHub Updates

### Secret scanning update

GitHub expanded secret scanning for coding agents.

> **Source:** [GitHub Changelog · 2026-03-17](https://github.blog/changelog/secret-scanning/)
`,
    { fallbackDate: 'August 13, 2026' }
  );

  assert.deepEqual(updates, [
    {
      type: 'From github-info.md',
      date: 'March 17, 2026',
      section: 'Latest GitHub Updates',
      title: 'Secret scanning update',
      summary: 'GitHub expanded secret scanning for coding agents.',
      href: 'https://github.blog/changelog/secret-scanning/',
      bullets: [],
      sourceLabel: 'GitHub Changelog · 2026-03-17',
    },
  ]);
});

test('renders each bullet-only entry exactly once', () => {
  const [update] = parseGithubInfoMarkdown(
    `# GitHub Info

## Current homepage themes

- Repositories and pull requests.
- GitHub Copilot.
- GitHub Actions.
`,
    { fallbackDate: 'August 13, 2026' }
  );

  assert.equal(update.summary, 'Repositories and pull requests.');
  assert.deepEqual(update.bullets, ['GitHub Copilot.', 'GitHub Actions.']);
  assert.equal(
    [update.summary, ...update.bullets].filter(
      (item) => item === 'Repositories and pull requests.'
    ).length,
    1
  );
});

test('falls back to repository content anchors and the publish date', () => {
  const [update] = parseGithubInfoMarkdown(
    `## Notes

An update without source metadata.
`,
    { fallbackDate: 'August 13, 2026' }
  );

  assert.equal(update.href, '#content-sources');
  assert.equal(update.date, 'August 13, 2026');
  assert.equal(update.sourceLabel, '');
});
