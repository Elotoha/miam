/**
 * Authentification — sessions par cookie + D1.
 * Hachage de mot de passe via Web Crypto (PBKDF2).
 */

export interface User {
  id: number;
  email: string;
  daily_points_target: number;
}

const SESSION_COOKIE = "miam_session";

// --- Hachage de mot de passe (PBKDF2 via Web Crypto) ---

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const computedB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return computedB64 === hashB64;
}

// --- Sessions ---

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[/+=]/g, "");
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 jours
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  return token;
}

export async function getUserFromRequest(
  db: D1Database,
  request: Request,
): Promise<User | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!sessionCookie) return null;

  const token = sessionCookie.split("=")[1];
  if (!token) return null;

  const result = await db
    .prepare(
      `SELECT u.id, u.email, u.daily_points_target
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')
       LIMIT 1`,
    )
    .bind(token)
    .first<User>();

  return result ?? null;
}

export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function deleteSession(db: D1Database, request: Request): Promise<void> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!sessionCookie) return;
  const token = sessionCookie.split("=")[1];
  if (token) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
}
