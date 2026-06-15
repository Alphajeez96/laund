import {parsePhoneNumberFromString, type CountryCode} from "libphonenumber-js";

export const toE164 = (input: string, country: CountryCode = "NG"): string => {
  const parsed = parsePhoneNumberFromString(input.trim(), country);
  return `${parsed?.countryCallingCode ?? ""}${parsed?.nationalNumber ?? ""}`;
};
export const toNationalDigits = (raw: string): string => {
  const parsed = parsePhoneNumberFromString(raw.trim());
  if (parsed?.isValid()) {
    return parsed.format("NATIONAL").replace(/\D/g, "");
  }
  return raw.trim();
};
