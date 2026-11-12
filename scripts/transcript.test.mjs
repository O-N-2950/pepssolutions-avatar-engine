import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from '../packages/demo-app/node_modules/typescript/lib/typescript.js';

const source = await readFile(new URL('../packages/demo-app/src/transcript.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { findLastUnfinished } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'));

test('a user partial is replaced without selecting an assistant or older final line', () => {
  const lines = [
    { role: 'user', text: 'First', final: false },
    { role: 'user', text: 'Completed', final: true },
    { role: 'user', text: 'Latest partial', final: false },
    { role: 'assistant', text: 'Response partial', final: false },
  ];
  const snapshot = structuredClone(lines);
  assert.equal(findLastUnfinished(lines, 'user'), 2);
  assert.equal(findLastUnfinished(lines, 'assistant'), 3);
  assert.deepEqual(lines, snapshot);
});

test('empty and completed conversations require a new line', () => {
  assert.equal(findLastUnfinished([], 'user'), -1);
  assert.equal(findLastUnfinished([{ role: 'assistant', text: 'Done', final: true }], 'assistant'), -1);
});

test('lookup supports ES2020 arrays without findLastIndex', () => {
  const lines = [{ role: 'user', text: 'Partial', final: false }];
  Object.defineProperty(lines, 'findLastIndex', { value: undefined });
  assert.equal(findLastUnfinished(lines, 'user'), 0);
});
