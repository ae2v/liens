import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ae2v_admin";
const SESSION_AGE = 60 * 60 * 12;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET n’est pas configuré.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function passwordMatches(value: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function createAdminSession() {
  const store = await cookies();
  const expires = Math.floor(Date.now() / 1000) + SESSION_AGE;
  const payload = `admin.${expires}`;
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
    path: "/", maxAge: SESSION_AGE,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [role, expiresRaw, signature] = token.split(".");
  if (role !== "admin" || !expiresRaw || !signature || Number(expiresRaw) < Date.now() / 1000) return false;
  const payload = `${role}.${expiresRaw}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
