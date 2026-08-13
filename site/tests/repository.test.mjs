import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('development and exercise guidance point to working targets', async () => {
  const launch = JSON.parse(
    await readFile(new URL('../../.vscode/launch.json', import.meta.url), 'utf8'),
  );
  const environment = JSON.parse(
    await readFile(new URL('../../.cursor/environment.json', import.meta.url), 'utf8'),
  );
  assert.equal(
    launch.configurations[0].serverReadyAction.uriFormat,
    'http://localhost:4321/Gareth/',
  );
  assert.match(environment.terminals[0].description, /http:\/\/localhost:4321\/Gareth\//);

  const stepTwoGuide = await readFile(
    new URL('../../.github/steps/2-step.md', import.meta.url),
    'utf8',
  );
  const workflowSampleMatch = stepTwoGuide.match(/```markdown\n([\s\S]*?)\n\s*```/);
  assert.ok(workflowSampleMatch, 'Missing Step 2 workflow sample');
  const workflowSample = workflowSampleMatch[1]
    .split('\n')
    .map((line) => line.replace(/^ {3}/, ''))
    .join('\n');
  assert.match(workflowSample, /^on:\n {2}workflow_dispatch:\n {2}schedule:/m);
  assert.match(workflowSample, /^safe-outputs:\n {2}create-pull-request:/m);
  assert.match(workflowSample, /^tools:\n {2}edit:\n {2}web-fetch:/m);
  assert.match(workflowSample, /^network:\n {2}allowed:/m);

  const stepTwoWorkflow = await readFile(
    new URL('../../.github/workflows/2-step.yml', import.meta.url),
    'utf8',
  );
  assert.equal(
    stepTwoWorkflow.match(/github\.event\.pull_request\.merged == true/g)?.length,
    2,
  );

  const sourceUrl = 'https://github.com/github/awesome-copilot/tree/main/workflows';
  const deadSourceUrl = 'https://awesome-copilot.github.com/workflows/';
  const stepThreeGuide = await readFile(
    new URL('../../.github/steps/3-step.md', import.meta.url),
    'utf8',
  );
  const reviewGuide = await readFile(
    new URL('../../.github/steps/x-review.md', import.meta.url),
    'utf8',
  );
  assert.ok(stepThreeGuide.includes(sourceUrl));
  assert.ok(reviewGuide.includes(sourceUrl));
  assert.ok(!stepThreeGuide.includes(deadSourceUrl));
  assert.ok(!reviewGuide.includes(deadSourceUrl));
});
