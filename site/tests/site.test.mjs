import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseContentUpdates } from '../src/lib/github-info.js';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

async function getExistingDevOrigin() {
  try {
    const devInfo = JSON.parse(
      await readFile(new URL('../.astro/dev.json', import.meta.url), 'utf8'),
    );
    const origin = `http://127.0.0.1:${devInfo.port}`;
    const response = await fetch(`${origin}/Gareth/`);
    return response.ok ? origin : null;
  } catch {
    return null;
  }
}

async function startDevServer(port) {
  const astroBin = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
  const child = spawn(
    process.execPath,
    [astroBin, 'dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: siteRoot,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  const ready = new Promise((resolve, reject) => {
    const handleOutput = (chunk) => {
      output += chunk;
      if (output.includes(`:${port}/`)) resolve();
    };
    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    child.once('exit', (code) => {
      reject(new Error(`Astro dev exited with code ${code} before startup:\n${output}`));
    });
  });
  await ready;
  return child;
}

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

test('development public assets use the configured base path', { timeout: 10_000 }, async (context) => {
  const existingOrigin = await getExistingDevOrigin();
  const port = existingOrigin ? null : await getAvailablePort();
  const child = existingOrigin ? null : await startDevServer(port);
  if (child) {
    context.after(async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await once(child, 'exit');
      }
    });
  }

  const origin = existingOrigin ?? `http://127.0.0.1:${port}`;
  const pageResponse = await fetch(`${origin}/Gareth/`);
  assert.equal(pageResponse.status, 200);
  const html = (await pageResponse.text()).replaceAll('&quot;', '"');
  const cssAssetReferences = [...html.matchAll(/url\(\s*(["']?)(\/[^"')]+)\1\s*\)/g)]
    .map((match) => match[2]);
  const gridReference = cssAssetReferences.find((reference) => reference.endsWith('/graphics/grid.svg'));

  assert.equal(gridReference, '/Gareth/graphics/grid.svg');
  const gridResponse = await fetch(`${origin}${gridReference}`);
  assert.equal(gridResponse.status, 200);
  assert.match(gridResponse.headers.get('content-type') ?? '', /^image\/svg\+xml/);

  const faviconResponse = await fetch(`${origin}/Gareth/favicon.svg`);
  assert.equal(faviconResponse.status, 200);
  const faviconSource = await faviconResponse.text();
  const nestedImageReference = faviconSource.match(/<image[\s\S]*?\bhref="([^"]+)"/)?.[1];
  assert.equal(nestedImageReference, 'mona2.png');

  const nestedImageUrl = new URL(nestedImageReference, faviconResponse.url);
  assert.equal(nestedImageUrl.pathname, '/Gareth/mona2.png');
  const nestedImageResponse = await fetch(nestedImageUrl);
  assert.equal(nestedImageResponse.status, 200);
  assert.match(nestedImageResponse.headers.get('content-type') ?? '', /^image\/png/);
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
