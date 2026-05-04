import {getPartnerAccessToken} from "./auth";
import {requestJson} from "@/utils/catch-async";
import {type PartnerAppTokenResponse} from "./types";

type ContactDetails = {
  appId: string;
  contactName?: string;
  contactEmail?: string;
  contactNumber?: string; // these(contactName, CE,CN) would potentially serve for master admin for Laundries if/when need be
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
  const parsed = await requestJson<{status: string; appId: string}>("app", {
    method: "PUT",
    context: "update contact details",
    body: new URLSearchParams(data),
  });

  return parsed;
};
