import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseLocalizableStrings,
  serializeLocalizableStrings,
} from '@/i18n/parse-localizable-strings';

describe('parseLocalizableStrings', () => {
  it('parses iOS Localizable.strings entries', () => {
    const source = `
      /* Settings */
      "settings" = "Settings";
      "newGame" = "New Game";
      "continueWithTeam" = "Continue with {team}";
      "quoted" = "Say \\"hello\\"";
    `;

    assert.deepEqual(parseLocalizableStrings(source), {
      settings: 'Settings',
      newGame: 'New Game',
      continueWithTeam: 'Continue with {team}',
      quoted: 'Say "hello"',
    });
  });

  it('round-trips entries through the serializer', () => {
    const entries = {
      settings: 'Ayarlar',
      deleteAllDataConfirmMessage:
        'Tüm kayıtlı simülasyonlar silinir. Ayarların korunur.',
    };

    assert.deepEqual(parseLocalizableStrings(serializeLocalizableStrings(entries)), entries);
  });
});
