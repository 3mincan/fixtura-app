export function normalizeGoalInputText(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 2);

  if (digits.length <= 1) {
    return digits;
  }

  return digits.replace(/^0+(?=\d)/, '');
}

export function clearDefaultGoalOnFocus(value: string): string {
  return value === '0' ? '' : value;
}

export function restoreBlankGoalOnBlur(value: string): string {
  if (value.trim() === '') {
    return '0';
  }

  return normalizeGoalInputText(value);
}

export function parseGoalInput(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}
