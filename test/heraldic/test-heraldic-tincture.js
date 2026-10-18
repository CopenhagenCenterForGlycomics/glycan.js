/*global QUnit*/
'use strict';

import { classifyTincture, tinctureForColor, HERALDIC_PATTERNS } from '../../js/Heraldic/heraldicTincture';

QUnit.module('Test heraldic tincture classification', {
});

QUnit.test('classifies the actual SNFG palette to the expected tinctures', function(assert) {
  assert.equal(classifyTincture('#fff'), 'argent', 'white (Glc family)');
  assert.equal(classifyTincture('#000'), 'sable', 'black');
  assert.equal(classifyTincture('#ffd400'), 'or', 'yellow (Gal/GalNAc)');
  assert.equal(classifyTincture('#00a651'), 'vert', 'green (Man)');
  assert.equal(classifyTincture('#0072bc'), 'azure', 'blue (Glc/GlcNAc)');
  assert.equal(classifyTincture('#a54399'), 'purpure', 'purple (NeuAc)');
  assert.equal(classifyTincture('#ed1c24'), 'gules', 'red (Fuc)');
  assert.equal(classifyTincture('#f47920'), 'tenne', 'orange (Xyl)');
});

QUnit.test('tinctureForColor returns the matching Petra Sancta pattern', function(assert) {
  assert.equal(tinctureForColor('#ffd400').texture, 'dots');
  assert.equal(tinctureForColor('#00a651').texture, 'hatch');
  assert.equal(tinctureForColor('#000').texture, 'crosshatch');
  assert.equal(tinctureForColor('#fff').texture, 'solid');
});

QUnit.test('falls back to argent for a missing/none fill', function(assert) {
  assert.equal(tinctureForColor(undefined), HERALDIC_PATTERNS.argent);
  assert.equal(tinctureForColor('none'), HERALDIC_PATTERNS.argent);
});

QUnit.test('every tincture pattern is self-consistent', function(assert) {
  for (const [name, pattern] of Object.entries(HERALDIC_PATTERNS)) {
    assert.equal(pattern.tincture, name);
    if (pattern.texture === 'crosshatch') {
      assert.notEqual(pattern.hatchAngle, pattern.hatchAngle2, `${name} crosses two distinct angles`);
    }
  }
});
