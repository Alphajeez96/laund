import {getPartnerAccessToken} from "./auth";
import {requestJson} from "@/utils/catch-async";
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
  lang: string;
  regenerate: boolean;
};

export const createApp = async (name: string) => {
  const partnerToken = await getPartnerAccessToken();
  const body = new URLSearchParams({
    name,
    templateMessaging: "true",
  });
  const parsed = await requestJson<{status: string; appId: string}>("app", {
    method: "POST",
    context: "Create App",
    headers: {
      token: partnerToken,
    },
    body,
  });

  return parsed;
};

export const getAppDetails = async (appId: string) => {
  const details = await requestJson<PartnerAppTokenResponse>(
    `app/${appId}/details`,
    {context: "partner app token"},
  );

  return details;
};

export const setContactDetails = async (data: ContactDetails) => {
  const response = await requestJson<{status: string; appId: string}>(
    `app/${data.appId}/onboarding/contact`,
    {
      method: "PUT",
      context: "set contact details",
      body: new URLSearchParams(data),
    },
  );

  return response;
};

export const generateEmbedLink = async (data: IGenerateEmbed) => {
  const {appId, user, lang, regenerate} = data;
  const response = await requestJson<{status: string; link: string}>(
    `app/${appId}/onboarding/embed/link?regenerate=${regenerate}&user=${user}&lang=${lang}`,
    {context: "generate embed link"},
  );

  return response;
};

export const resendEmbedLink = async (appId: string) => {
  await requestJson(`app/${appId}/onboarding/contact/email/resend`, {
    method: "POST",
    context: "resend embed link",
  });
};
