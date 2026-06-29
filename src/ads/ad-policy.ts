export type AdIntensity = 'minimal' | 'normal' | 'heavy';

export type AdGate = 'round-summary' | 'matchday-end' | 'tournament-end';

export type AdPolicyInput = {
  aiEnabled: boolean;
  autoReveal: boolean;
};

const INTERSTITIAL_COOLDOWN_MS = 90_000;

let lastInterstitialShownAt = 0;
let roundSummaryCount = 0;
let matchdayEndCount = 0;

export function resolveAdIntensity(input: AdPolicyInput): AdIntensity {
  if (input.aiEnabled && input.autoReveal) {
    return 'heavy';
  }

  if (input.aiEnabled || input.autoReveal) {
    return 'normal';
  }

  return 'minimal';
}

export function shouldShowMatchdayBanner(_intensity: AdIntensity): boolean {
  return true;
}

export function shouldShowHomeBanner(_intensity: AdIntensity): boolean {
  return true;
}

export function shouldShowInterstitial(gate: AdGate, intensity: AdIntensity): boolean {
  const now = Date.now();

  if (now - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) {
    return false;
  }

  switch (gate) {
    case 'tournament-end':
      return true;
    case 'round-summary':
      if (intensity === 'minimal') {
        return (roundSummaryCount + 1) % 2 === 0;
      }

      return true;
    case 'matchday-end':
      if (intensity === 'heavy') {
        return true;
      }

      return (matchdayEndCount + 1) % 2 === 0;
    default:
      return false;
  }
}

export function recordInterstitialShown(gate: AdGate): void {
  lastInterstitialShownAt = Date.now();

  if (gate === 'round-summary') {
    roundSummaryCount += 1;
  }

  if (gate === 'matchday-end') {
    matchdayEndCount += 1;
  }
}

export function resetInterstitialCooldownForTests(): void {
  lastInterstitialShownAt = 0;
}

export function resetAdSessionCounters(): void {
  roundSummaryCount = 0;
  matchdayEndCount = 0;
  lastInterstitialShownAt = 0;
}
