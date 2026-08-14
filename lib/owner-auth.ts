import crypto from "crypto";
import { cookies } from "next/headers";

const OWNER_SESSION_COOKIE = "cfc_owner_session";

function getOwnerCredentials() {
  return {
    username: process.env.OWNER_USERNAME ?? "owner",
    password: process.env.OWNER_PASSWORD ?? "",
    secret: process.env.OWNER_SESSION_SECRET ?? process.env.OWNER_PASSWORD ?? "",
  };
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function hasOwnerCredentials() {
  return Boolean(getOwnerCredentials().password);
}

export function verifyOwnerLogin(username: string, password: string) {
  const credentials = getOwnerCredentials();

  return (
    credentials.password.length > 0 &&
    username === credentials.username &&
    password === credentials.password
  );
}

export function createOwnerSessionValue() {
  const credentials = getOwnerCredentials();
  const payload = `owner:${Date.now()}`;

  return `${payload}.${sign(payload, credentials.secret)}`;
}

export async function setOwnerSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: OWNER_SESSION_COOKIE,
    value: createOwnerSessionValue(),
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/owner",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearOwnerSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: OWNER_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/owner",
  });
}

export async function isOwnerAuthenticated() {
  const credentials = getOwnerCredentials();
  const cookieStore = await cookies();
  const session = cookieStore.get(OWNER_SESSION_COOKIE)?.value;

  if (!credentials.secret || !session) {
    return false;
  }

  const [payload, signature] = session.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload, credentials.secret);

  if (signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
