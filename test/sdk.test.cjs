const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

test('partial appearance updates preserve other colors, features and preset isolation', () => {
  const source = fs.readFileSync('packages/avatar-sdk/src/index.ts', 'utf8');
  const js = stripTypeScriptTypes(source.replace(/import \{[\s\S]*?\} from "@peps\/avatar-engine"/, ''), { mode: 'transform' })
    .replace(/export \{[^}]+\} from [^\n]+/g, '')
    .replace('export function create', 'function create');
  let rendered;
  const preset = { colors: { skin: 'old', hair: 'brown' }, features: { glasses: false, beard: false } };
  const ctx = vm.createContext({
    PRESET_WINIE: preset, PRESET_WINI: preset,
    createAnimator() { return {}; }, updateAnimator() {},
    renderAvatar(context, animator, config) { rendered = config; },
    document: { createElement() { return { style: {}, getContext() { return {}; } }; } },
    window: { devicePixelRatio: 1 },
    requestAnimationFrame(fn) { ctx.tick = fn; return 1; }, cancelAnimationFrame() {},
  });
  vm.runInContext(js + '\nthis.createAvatar = create;', ctx);
  const avatar = ctx.createAvatar({ container: { appendChild() {} } });
  avatar.updateConfig({ colors: { skin: 'new' }, features: { glasses: true } });
  ctx.tick(10);
  assert.equal(rendered.colors.skin, 'new');
  assert.equal(rendered.colors.hair, 'brown');
  assert.equal(rendered.features.glasses, true);
  assert.equal(rendered.features.beard, false);
  assert.equal(preset.colors.skin, 'old');
});
