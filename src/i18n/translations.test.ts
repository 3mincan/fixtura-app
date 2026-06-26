import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { translate } from '@/i18n/translations';

describe('translate', () => {
  it('returns German copy when German is selected', () => {
    assert.equal(translate('de', 'settings'), 'Einstellungen');
    assert.equal(translate('de', 'newGame'), 'Neues Spiel');
  });

  it('returns Turkish copy when Turkish is selected', () => {
    assert.equal(translate('tr', 'settings'), 'Ayarlar');
    assert.equal(translate('tr', 'newGame'), 'Yeni Oyun');
    assert.equal(translate('tr', 'aiScores'), 'AI skorları');
  });

  it('interpolates reveal progress values', () => {
    assert.equal(
      translate('en', 'revealNext', { current: 2, total: 5 }),
      'Reveal next result (2/5)',
    );
  });

  it('interpolates selected team elimination copy', () => {
    assert.equal(
      translate('en', 'selectedTeamEliminatedDescription', {
        team: 'Mexico',
        round: 'Quarter Final',
      }),
      'Mexico was eliminated in the Quarter Final. The remaining tournament was simulated.',
    );
  });
});
