import {parsePhoneNumberFromString, type CountryCode} from "libphonenumber-js";

/** Normalize to E.164 for matching against `Laundry.whatsappNumber`. */
export const toE164 = (raw: string): string => {
  const parsed = parsePhoneNumberFromString(raw.trim());
  if (parsed?.isValid()) {
    return parsed.format("E.164");
  }
  return raw.trim();
};

/** Normalize a local number (e.g. 080...) to E.164 */
export const toLocalE164 = (
  raw: string,
  countryCode: CountryCode = "NG",
): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = parsePhoneNumberFromString(trimmed, countryCode);
  if (parsed?.isValid()) {
    return parsed.format("E.164");
  }
  return "";
};

/** Meta send API expects digits only (no `+`). */
export const toWhatsAppRecipientDigits = (e164: string): string => {
  return e164.replace(/\D/g, "");
};

/** Inbound `messages[].from` is digits only (no `+`). */
export const inboundWaFromToE164 = (from: string): string => {
  const digits = from.replace(/\D/g, "");
  if (!digits) return from.trim();
  return toE164(`+${digits}`);
};

// Converts to 081xxxxx
export const toNationalDigits = (raw: string): string => {
  const parsed = parsePhoneNumberFromString(raw.trim());
  if (parsed?.isValid()) {
    return parsed.format("NATIONAL").replace(/\D/g, "");
  }
  return raw.trim();
};
