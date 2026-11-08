import jwt from "jsonwebtoken";

// Secret de repli réservé au développement local : il est public (présent dans le dépôt).
const DEV_ONLY_SECRET = "dev-only-secret";

export type SessionPayload = {
  userId: string;
  organizationId: string;
};

/**
 * Secret de signature des sessions.
 * En production, l'absence de JWT_SECRET ne doit jamais retomber sur le secret public :
 * on renvoie null et aucune session ne peut être créée ni acceptée (échec « fermé »).
 * La lecture est faite à chaque appel (et non au chargement du module) pour ne pas
 * faire échouer le build quand la variable n'est disponible qu'à l'exécution.
 */
function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error("JWT_SECRET n'est pas défini : les connexions sont refusées tant que la variable n'est pas configurée.");
    return null;
  }
  return DEV_ONLY_SECRET;
}

/** Indique si les sessions peuvent être signées (faux en production sans JWT_SECRET). */
export function isSessionSigningConfigured(): boolean {
  return getJwtSecret() !== null;
}

export function signSession(payload: SessionPayload): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("Configuration serveur incomplète : la variable JWT_SECRET est requise en production.");
  }
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as SessionPayload;
  } catch {
    return null;
  }
}
