import config from "@/config/config";
import {requestJson} from "@/utils/catch-async";

export const setSubscription = async (data: {name: string; appId: string}) => {
  const payload = {
    showOnUI: "true",
    tag: `nmtg${data.name}`,
    url: config.gupshup.webhookUrl,
    version: config.gupshup.apiVersion,
    modes:
      "MESSAGE,ENQUEUED,SENT,DELIVERED,READ,FAILED,DELETED,ACCOUNT,TEMPLATE,FLOWS_MESSAGE,OTHERS",
  };

  const response = await requestJson<{status: string; appId: string}>(
    `app/${data.appId}/subscription`,
    {
      method: "POST",
      context: "set subscription",
      body: new URLSearchParams(payload),
    },
    "Authorization",
  );

  return response;
};

export const deleteSubscriptions = async (appId: string) => {
  await requestJson<{status: string; appId: string}>(
    `app/${appId}/subscription`,
    {
      method: "DELETE",
      context: "Delete subscriptions",
    },
    "Authorization",
  );
};
