export function resolveProductionInterstitialUnitId(
  envUnitId: string | undefined,
  productionUnitId: string,
): string | null {
  const configuredUnitId = envUnitId && envUnitId.length > 0 ? envUnitId : productionUnitId;
  return configuredUnitId.length > 0 ? configuredUnitId : null;
}
