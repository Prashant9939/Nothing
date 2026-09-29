export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 6 characters and include an uppercase letter, a lowercase letter, a number and a symbol';

export type PasswordCheckKey = 'length' | 'upper' | 'lower' | 'digit' | 'symbol';

export const PASSWORD_CHECKS: { key: PasswordCheckKey; label: string }[] = [
  { key: 'length', label: 'At least 6 characters' },
  { key: 'upper', label: 'Uppercase letter (A-Z)' },
  { key: 'lower', label: 'Lowercase letter (a-z)' },
  { key: 'digit', label: 'Number (0-9)' },
  { key: 'symbol', label: 'Symbol (!@#$...)' },
];

export function passwordChecks(value: string): Record<PasswordCheckKey, boolean> {
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9\s]/.test(value),
  };
}

export function passwordIsValid(value: string): boolean {
  return Object.values(passwordChecks(value)).every(Boolean);
}

export function passwordPolicyError(value: string): string | null {
  return passwordIsValid(value) ? null : PASSWORD_RULE_MESSAGE;
}
