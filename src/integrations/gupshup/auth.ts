import config from "@/config/config";

const FALLBACK_CACHE_MS = 23 * 60 * 60 * 1000;
let cache: {token: string; expiresAtMs: number} | null = null;

const ttlMsFromJwt = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as {exp?: number};
    if (payload.exp && typeof payload.exp === "number") {
      const secLeft = payload.exp - Math.floor(Date.now() / 1000);
      return Math.max(0, secLeft * 1000 - 60_000);
    }
  } catch {
    // ignore
  }
  return null;
};

export const getPartnerAccessToken = async (): Promise<string> => {
  const email = config.gupshup.partnerEmail;
  if (!email) throw new Error("Partner email is not set");

  const now = Date.now();
  if (cache && now < cache.expiresAtMs) return cache.token;

  const url = `${config.gupshup.baseUrl}account/login`;
  const body = new URLSearchParams({
    email,
    password: config.gupshup.clientSecret,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await res.text();
  const parsed = JSON.parse(raw);

  if (!res.ok || parsed.status === "error") {
    throw new Error(
      `partner login failed: ${res.status} ${parsed.message ?? raw.slice(0, 200)}`,
    );
  }

  const token = parsed.token;
  const ttlFromJwt = ttlMsFromJwt(token);
  cache = {
    token,
    expiresAtMs: now + (ttlFromJwt !== null ? ttlFromJwt : FALLBACK_CACHE_MS),
  };

  return token;
};

export function clearPartnerTokenCache(): void {
  cache = null;
}
