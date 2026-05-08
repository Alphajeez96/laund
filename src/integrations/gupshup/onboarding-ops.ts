import {requestPartnerJson} from "@/utils/catch-async";
import {type PartnerAppTokenResponse} from "./types";

type ContactDetails = {
  appId: string;
  contactName?: string;
  contactEmail?: string;
  contactNumber?: string; // these(contactName, CE,CN) would potentially serve for master admin for Laundries if/when need be
};

type IGenerateEmbed = {
  appId: string;
  user: string;
  lang?: string;
  regenerate?: boolean;
};

export const createApp = async (name: string) => {
  const body = new URLSearchParams({
    name,
    templateMessaging: "true",
  });
  const response = await requestPartnerJson<{status: string; appId: string}>(
    "app",
    {
      method: "POST",
      context: "Create App",
      body,
    },
  );

  return response;
};

export const getAppDetails = async (appId: string) => {
  const details = await requestPartnerJson<PartnerAppTokenResponse>(
    `app/${appId}/details`,
    {context: "get app details"},
  );

  return details;
};

export const setContactDetails = async (data: ContactDetails) => {
  const {appId, ...rest} = data;
  const response = await requestPartnerJson<{status: string; appId: string}>(
    `app/${appId}/onboarding/contact`,
    {
      method: "PUT",
      context: "set contact details",
      body: new URLSearchParams(rest),
    },
  );

  return response;
};

export const generateEmbedLink = async (data: IGenerateEmbed) => {
  const {appId, user, lang = "English", regenerate = "true"} = data;
  const response = await requestPartnerJson<{status: string; link: string}>(
    `app/${appId}/onboarding/embed/link?regenerate=${regenerate}&user=${user}&lang=${lang}`,
    {context: "generate embed link"},
  );

  return response;
};

export const resendEmbedLink = async (appId: string) => {
  await requestPartnerJson(`app/${appId}/onboarding/contact/email/resend`, {
    method: "POST",
    context: "resend embed link",
  });
};
