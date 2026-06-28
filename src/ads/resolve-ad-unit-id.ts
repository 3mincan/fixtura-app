function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function shouldUseTestAdUnits(): boolean {
  return __DEV__ || isTruthyEnv(process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS);
}

export function resolveAdUnitId(
  envUnitId: string | undefined,
  productionUnitId: string,
  testUnitId: string,
  useTestAds = shouldUseTestAdUnits(),
): string {
  if (useTestAds) {
    return testUnitId;
  }

  const configuredUnitId = envUnitId && envUnitId.length > 0 ? envUnitId : productionUnitId;
  return configuredUnitId.length > 0 ? configuredUnitId : testUnitId;
}
