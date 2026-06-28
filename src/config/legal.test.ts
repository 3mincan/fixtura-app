import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  DEFAULT_AD_REPORT_EMAIL,
  DEFAULT_MARKETING_URL,
  DEFAULT_PRIVACY_POLICY_URL,
  DEFAULT_SUPPORT_URL,
} from '@/config/legal';

describe('legal urls', () => {
  it('defaults to fixtura.xyz legal pages', () => {
    assert.equal(DEFAULT_MARKETING_URL, 'https://fixtura.xyz');
    assert.equal(DEFAULT_PRIVACY_POLICY_URL, 'https://fixtura.xyz/privacy');
    assert.equal(DEFAULT_SUPPORT_URL, 'https://fixtura.xyz/support');
    assert.equal(DEFAULT_AD_REPORT_EMAIL, 'support@fixtura.xyz');
  });

  it('matches App Store Connect metadata file', () => {
    const metadata = JSON.parse(
      readFileSync(new URL('../../store.config.json', import.meta.url), 'utf8'),
    ) as {
      apple: {
        info: {
          'en-US': {
            marketingUrl: string;
            supportUrl: string;
            privacyPolicyUrl: string;
          };
        };
      };
    };

    const info = metadata.apple.info['en-US'];

    assert.equal(info.marketingUrl, DEFAULT_MARKETING_URL);
    assert.equal(info.privacyPolicyUrl, DEFAULT_PRIVACY_POLICY_URL);
    assert.equal(info.supportUrl, DEFAULT_SUPPORT_URL);
  });
});
