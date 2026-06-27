import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getGtmContainerId } from '@/config/gtm';
import { pushGtmEvent } from '@/services/gtm';

describe('gtm', () => {
  const originalEnv = process.env.EXPO_PUBLIC_GTM_CONTAINER_ID;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_GTM_CONTAINER_ID;
    } else {
      process.env.EXPO_PUBLIC_GTM_CONTAINER_ID = originalEnv;
    }
  });

  it('uses the default container id when env is unset', () => {
    delete process.env.EXPO_PUBLIC_GTM_CONTAINER_ID;

    assert.equal(getGtmContainerId(), 'GTM-K8KV7BCB');
  });

  it('prefers EXPO_PUBLIC_GTM_CONTAINER_ID when set', () => {
    process.env.EXPO_PUBLIC_GTM_CONTAINER_ID = 'GTM-TEST123';

    assert.equal(getGtmContainerId(), 'GTM-TEST123');
  });

  it('does not throw when pushing events outside the browser', () => {
    assert.doesNotThrow(() => {
      pushGtmEvent('team_selected', { teamId: 'mex' });
    });
  });
});
