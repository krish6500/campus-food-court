import crypto from "crypto";

type JwtPayload = {
  sub: string;
  name: string;
  mobile: string;
  exp: number;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getSecret() {
  return process.env.CUSTOMER_JWT_SECRET ?? "super-bazar-local-secret";
}

export function signCustomerToken(payload: Omit<JwtPayload, "exp">) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 }),
  );
  const signature = base64Url(
    crypto.createHmac("sha256", getSecret()).update(`${header}.${body}`).digest(),
  );

  return `${header}.${body}.${signature}`;
}

export function verifyCustomerToken(token: string) {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    return null;
  }

  const expected = base64Url(
    crypto.createHmac("sha256", getSecret()).update(`${header}.${body}`).digest(),
  );

  if (signature !== expected) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as JwtPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
