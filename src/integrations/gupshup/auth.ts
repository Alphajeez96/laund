import config from "@/config/config";
import {requestJson} from "@/utils/catch-async";
import {type PartnerAppTokenResponse, type PartnerLoginResponse} from "./types";

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

  const body = new URLSearchParams({
    email,
    password: config.gupshup.clientSecret,
  });

  const parsed = await requestJson<PartnerLoginResponse>("account/login", {
    context: "partner login",
    method: "POST",
    body,
  });

  const token = parsed.token;
  if (!token) throw new Error("partner login: token missing in response");
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

export const getAppAccessToken = async (appId: string): Promise<string> => {
  if (!appId) throw new Error("appId is required");

  const parsed = await requestJson<PartnerAppTokenResponse>(
    `app/${encodeURIComponent(appId)}/token`,
    {context: "partner app token"},
    "Authorization",
  );

  const appToken = parsed.token?.token;
  if (!appToken) {
    throw new Error(
      `partner app token missing in response: ${JSON.stringify(parsed).slice(0, 240)}`,
    );
  }
  return appToken;
};
