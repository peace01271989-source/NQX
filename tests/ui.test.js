import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('PLAY controls are integrated into the observation field and not fixed to the bottom', () => {
  assert.match(main, /class="field-interface"/);
  assert.match(main, /nav\('field-nav'\)/);
  assert.match(main, /class="aberrant-stage"/);
  assert.doesNotMatch(main, /bottom-nav/);
  assert.match(css, /\.play \.primary-actions button\{[^}]*background:transparent;[^}]*border:0;/);
  assert.doesNotMatch(css, /\.bottom-nav\{/);
});

test('PLAY advertisement remains outside the observation field', () => {
  const start = main.indexOf('function playScreen()');
  const end = main.indexOf('function meter(', start);
  const play = main.slice(start, end);
  const fieldClose = play.lastIndexOf('</section>');
  const ad = play.indexOf('${adSlot()}');
  assert.ok(fieldClose > -1 && ad > fieldClose, 'ad slot must be rendered after the observation field closes');
});

test('PLAY exposes live OBSERVE / BATTLE / SLEEP action handlers', () => {
  assert.match(main, /id="observe-btn"/);
  assert.match(main, /id="battle-btn"/);
  assert.match(main, /id="sleep-btn"/);
  assert.match(main, /addEventListener\('click',doObserve\)/);
  assert.match(main, /addEventListener\('click',doBattle\)/);
  assert.match(main, /addEventListener\('click',doSleep\)/);
  assert.match(main, /function battleMenuOverlay\(\)/);
  assert.match(main, /function battleFxOverlay\(\)/);
  assert.match(main, /for\(let turn=1;turn<=3;turn\+\+\)/);
});

test('adopted field background is integrated without intercepting input', () => {
  assert.match(css, /url\('\/nqx-field-bg\.webp'\)/);
  assert.match(css, /\.play \.observation-field::before\{/);
  assert.match(css, /pointer-events:none/);
});
