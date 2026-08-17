import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(
  new URL('../../src/app/events/create/components/EventDescriptionField.tsx', import.meta.url),
  'utf8',
);
const css = await readFile(
  new URL('../../src/app/events/create/CreateEventView.module.css', import.meta.url),
  'utf8',
);

test('auto-grows the event description through five visible lines', () => {
  assert.match(component, /textarea\.scrollHeight/);
  assert.match(component, /lineHeight \* 5 \+ verticalPadding/);
  assert.match(component, /textarea\.style\.height = `\$\{nextHeight\}px`/);
  assert.match(component, /useLayoutEffect\([\s\S]*\[description\]/);
});

test('switches to internal scrolling only after the five-line limit', () => {
  assert.match(component, /textarea\.scrollHeight > Math\.ceil\(maximumContentHeight\)/);
  assert.match(css, /\.descriptionInput\s*\{[\s\S]*max-height:\s*128px/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /white-space:\s*pre-wrap/);
  assert.match(css, /resize:\s*none/);
});
