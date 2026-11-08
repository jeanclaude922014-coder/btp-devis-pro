// Vérification des codes de récupération de mot de passe (sans service d'e-mail).
// Module séparé de la Server Action pour pouvoir être testé (src/lib/reset-code.test.ts).
import { createHash } from "node:crypto";

function sameSecret(a: string, b: string): boolean {
  // Comparaison à durée constante.
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Code de récupération provisoire, remis au propriétaire du compte. Seule son empreinte
// SHA-256 figure ici ; il cesse de fonctionner après la date indiquée.
// Il n'est accepté QUE pour le compte de son propriétaire (empreinte SHA-256 de l'e-mail,
// en minuscules) : il ne permet pas de réinitialiser les comptes des autres cabinets.
const BUILTIN_RESET_CODE_SHA256 = "543948298214338f7950341ffc0d39a6b22cad44ee41060c526bbd8f428f39f0";
const BUILTIN_RESET_EMAIL_SHA256 = "db0ed4d92c9f75ef5fd12e59f6c4fb2504e6a86be8bb76df9bf86e0b85caffb9";
const BUILTIN_RESET_CODE_EXPIRES = new Date("2026-11-17T23:59:59Z");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export type BuiltinResetCode = { codeSha256: string; emailSha256: string; expires: Date };

const BUILTIN: BuiltinResetCode = {
  codeSha256: BUILTIN_RESET_CODE_SHA256,
  emailSha256: BUILTIN_RESET_EMAIL_SHA256,
  expires: BUILTIN_RESET_CODE_EXPIRES,
};

/** Code accepté : celui de PASSWORD_RESET_CODE (tout compte), ou le code intégré
 *  avant son expiration et pour le seul compte de son propriétaire. */
export function codeAccepted(
  code: string,
  email: string,
  builtin: BuiltinResetCode = BUILTIN,
  now: Date = new Date()
): boolean {
  const configured = process.env.PASSWORD_RESET_CODE ?? "";
  if (configured.length >= 12 && sameSecret(code, configured)) return true;
  if (now.getTime() > builtin.expires.getTime()) return false;
  if (!sameSecret(sha256(email.trim().toLowerCase()), builtin.emailSha256)) return false;
  return sameSecret(sha256(code.toUpperCase()), builtin.codeSha256);
}
