// Tests de la signature des sessions (src/lib/jwt.ts) — audit A-01.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { isSessionSigningConfigured, signSession, verifySessionToken } from "./jwt";

const env = process.env as Record<string, string | undefined>;
const saved = { secret: env.JWT_SECRET, nodeEnv: env.NODE_ENV };
const payload = { userId: "u1", organizationId: "o1" };

afterEach(() => {
  env.JWT_SECRET = saved.secret;
  env.NODE_ENV = saved.nodeEnv;
});

test("Production sans JWT_SECRET : aucune session créée ni acceptée", () => {
  env.NODE_ENV = "production";
  delete env.JWT_SECRET;
  assert.equal(isSessionSigningConfigured(), false);
  assert.throws(() => signSession(payload));
  // Un jeton forgé avec l'ancien secret public doit être refusé.
  const forged = jwt.sign(payload, "dev-only-secret");
  assert.equal(verifySessionToken(forged), null);
});

test("Production avec JWT_SECRET : aller-retour signé / vérifié", () => {
  env.NODE_ENV = "production";
  env.JWT_SECRET = "secret-de-test-suffisamment-long";
  const token = signSession(payload);
  const back = verifySessionToken(token);
  assert.equal(back?.userId, "u1");
  assert.equal(back?.organizationId, "o1");
  // Le secret public ne permet pas de forger une session.
  assert.equal(verifySessionToken(jwt.sign(payload, "dev-only-secret")), null);
});

test("Développement sans JWT_SECRET : secret local de repli", () => {
  env.NODE_ENV = "development";
  delete env.JWT_SECRET;
  assert.equal(isSessionSigningConfigured(), true);
  assert.equal(verifySessionToken(signSession(payload))?.userId, "u1");
});
