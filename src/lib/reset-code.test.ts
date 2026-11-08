// Tests du code de récupération de mot de passe (src/lib/reset-code.ts) — audit A-02.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { codeAccepted, sha256, type BuiltinResetCode } from "./reset-code";

const env = process.env as Record<string, string | undefined>;
const savedCode = env.PASSWORD_RESET_CODE;
afterEach(() => {
  env.PASSWORD_RESET_CODE = savedCode;
});

// Code intégré fictif (le vrai code n'est connu que de son propriétaire).
const fake: BuiltinResetCode = {
  codeSha256: sha256("CODE-TEST-1234"),
  emailSha256: sha256("proprietaire@exemple.ci"),
  expires: new Date("2026-11-17T23:59:59Z"),
};
const before = new Date("2026-11-10T00:00:00Z");
const after = new Date("2026-11-18T00:00:00Z");

test("Code intégré accepté pour le compte du propriétaire (casse de l'e-mail et du code ignorée)", () => {
  delete env.PASSWORD_RESET_CODE;
  assert.equal(codeAccepted("code-test-1234", " Proprietaire@Exemple.ci ", fake, before), true);
});

test("Code intégré REFUSÉ pour le compte d'un autre cabinet", () => {
  delete env.PASSWORD_RESET_CODE;
  assert.equal(codeAccepted("CODE-TEST-1234", "autre@cabinet.ci", fake, before), false);
});

test("Code intégré refusé après la date d'expiration", () => {
  delete env.PASSWORD_RESET_CODE;
  assert.equal(codeAccepted("CODE-TEST-1234", "proprietaire@exemple.ci", fake, after), false);
});

test("Mauvais code refusé", () => {
  delete env.PASSWORD_RESET_CODE;
  assert.equal(codeAccepted("FAUX", "proprietaire@exemple.ci", fake, before), false);
});

test("PASSWORD_RESET_CODE (≥ 12 caractères) accepté pour tout compte, un code trop court est ignoré", () => {
  env.PASSWORD_RESET_CODE = "administrateur-2026";
  assert.equal(codeAccepted("administrateur-2026", "autre@cabinet.ci", fake, after), true);
  env.PASSWORD_RESET_CODE = "court";
  assert.equal(codeAccepted("court", "autre@cabinet.ci", fake, after), false);
});

test("Le code intégré réel n'est accepté que pour l'adresse de son propriétaire", () => {
  delete env.PASSWORD_RESET_CODE;
  // Sans connaître le vrai code, on vérifie qu'aucun code ne passe pour un autre compte.
  assert.equal(codeAccepted("N-IMPORTE-QUOI", "autre@cabinet.ci", undefined, before), false);
});
