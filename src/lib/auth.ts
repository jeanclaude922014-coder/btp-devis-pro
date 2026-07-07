import "server-only";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signSession, verifySessionToken, type SessionPayload } from "@/lib/jwt";

const SESSION_COOKIE = "session";

export type { SessionPayload };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { signSession, verifySessionToken };

/** Doit être appelé depuis une Server Action ou un Route Handler (pas un Server Component). */
export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Session + entités liées, pour les pages/Server Actions qui ont besoin des données complètes.
 *  Mis en cache par requête (React cache) pour éviter les doublons layout + page. */
export const requireSessionWithContext = cache(async function requireSessionWithContext() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
    include: { user: true, organization: true },
  });

  if (!membership) redirect("/login");

  return {
    session,
    user: membership.user,
    organization: membership.organization,
    role: membership.role,
  };
});
