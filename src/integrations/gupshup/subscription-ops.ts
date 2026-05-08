import config from "@/config/config";
import {requestAppJson} from "@/utils/catch-async";

export const setSubscription = async (data: {name: string; appId: string}) => {
  const payload = {
    showOnUI: "true",
    tag: `nmtg-${data.name}`,
    url: config.gupshup.webhookUrl,
    version: config.gupshup.apiVersion,
    modes:
      "MESSAGE,ENQUEUED,SENT,DELIVERED,READ,FAILED,DELETED,ACCOUNT,TEMPLATE,FLOWS_MESSAGE,OTHERS",
    meta: JSON.stringify({
      headers: {
        "x-gupshup-webhook-secret": config.gupshup.webhookSecret!,
      },
    }),
  };

  const response = await requestAppJson<{status: string}>(
    data.appId,
    `app/${data.appId}/subscription`,
    {
      method: "POST",
      context: "set subscription",
      body: new URLSearchParams(payload),
    },
  );

  return response;
};

export const deleteSubscriptions = async (appId: string) => {
  await requestAppJson<{status: string}>(appId, `app/${appId}/subscription`, {
    method: "DELETE",
    context: "Delete subscriptions",
  });
};
