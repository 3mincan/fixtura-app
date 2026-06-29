import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearDefaultGoalOnFocus,
  normalizeGoalInputText,
  parseGoalInput,
  restoreBlankGoalOnBlur,
} from '@/utils/score-input';

describe('score input helpers', () => {
  it('clears the default zero on focus', () => {
    assert.equal(clearDefaultGoalOnFocus('0'), '');
    assert.equal(clearDefaultGoalOnFocus('2'), '2');
  });

  it('restores zero when a score field is left blank', () => {
    assert.equal(restoreBlankGoalOnBlur(''), '0');
    assert.equal(restoreBlankGoalOnBlur('  '), '0');
    assert.equal(restoreBlankGoalOnBlur('03'), '3');
  });

  it('normalizes pasted score input to two numeric digits', () => {
    assert.equal(normalizeGoalInputText('a12b3'), '12');
    assert.equal(normalizeGoalInputText('09'), '9');
    assert.equal(normalizeGoalInputText('00'), '0');
  });

  it('treats a blank focused field as incomplete', () => {
    assert.equal(parseGoalInput(''), null);
    assert.equal(parseGoalInput('0'), 0);
    assert.equal(parseGoalInput('7'), 7);
  });
});
