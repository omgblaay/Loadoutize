export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordCheck {
  label: string;
  met: boolean;
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: `${PASSWORD_MIN_LENGTH}+ characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordChecks(password).every((check) => check.met);
}

export type PasswordStrength = "weak" | "fair" | "strong";

export function getPasswordStrength(password: string): { strength: PasswordStrength; score: number } {
  const score = getPasswordChecks(password).filter((check) => check.met).length;
  const strength: PasswordStrength = score <= 1 ? "weak" : score === 2 ? "fair" : "strong";
  return { strength, score };
}
