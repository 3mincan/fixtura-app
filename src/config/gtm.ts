const DEFAULT_GTM_CONTAINER_ID = 'GTM-K8KV7BCB';

export function getGtmContainerId(): string {
  const fromProcess = process.env.EXPO_PUBLIC_GTM_CONTAINER_ID;

  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return fromProcess;
  }

  return DEFAULT_GTM_CONTAINER_ID;
}
