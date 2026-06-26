import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeAppLanguage, resolveAppLanguageFromLanguageCode } from '@/i18n/resolve-app-language';

describe('resolveAppLanguageFromLanguageCode', () => {
  it('maps supported iOS language codes', () => {
    assert.equal(resolveAppLanguageFromLanguageCode('en'), 'en');
    assert.equal(resolveAppLanguageFromLanguageCode('tr'), 'tr');
    assert.equal(resolveAppLanguageFromLanguageCode('de'), 'de');
    assert.equal(resolveAppLanguageFromLanguageCode('es'), 'es');
    assert.equal(resolveAppLanguageFromLanguageCode('ar'), 'ar');
    assert.equal(resolveAppLanguageFromLanguageCode('ja'), 'ja');
    assert.equal(resolveAppLanguageFromLanguageCode('zh'), 'zh');
    assert.equal(resolveAppLanguageFromLanguageCode('zh-Hans'), 'zh');
    assert.equal(resolveAppLanguageFromLanguageCode('id'), 'id');
    assert.equal(resolveAppLanguageFromLanguageCode('pt'), 'pt');
    assert.equal(resolveAppLanguageFromLanguageCode('pt-BR'), 'pt');
    assert.equal(resolveAppLanguageFromLanguageCode('fr'), 'fr');
  });

  it('falls back to English for unsupported codes', () => {
    assert.equal(resolveAppLanguageFromLanguageCode('it'), 'en');
    assert.equal(resolveAppLanguageFromLanguageCode(undefined), 'en');
  });
});

describe('normalizeAppLanguage', () => {
  it('accepts supported languages', () => {
    assert.equal(normalizeAppLanguage('en'), 'en');
    assert.equal(normalizeAppLanguage('tr'), 'tr');
    assert.equal(normalizeAppLanguage('es'), 'es');
    assert.equal(normalizeAppLanguage('zh'), 'zh');
    assert.equal(normalizeAppLanguage('fr'), 'fr');
  });

  it('falls back to English for unsupported values', () => {
    assert.equal(normalizeAppLanguage('it'), 'en');
    assert.equal(normalizeAppLanguage(undefined), 'en');
  });
});
