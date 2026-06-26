import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRevealDelayMs } from '@/utils/reveal-timing';

describe('getRevealDelayMs', () => {
  it('returns slower delays for slower simulation speeds', () => {
    assert.ok(getRevealDelayMs('slow') > getRevealDelayMs('normal'));
    assert.ok(getRevealDelayMs('normal') > getRevealDelayMs('instant'));
  });
});
