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
    //MESSAGE mode should only be added if we need to receive hooks for inbounds to the app
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

export const getSubscriptions = async (appId: string) => {
  return requestAppJson(appId, `app/${appId}/subscription`, {
    method: "GET",
    context: "get subscriptions",
  });
};

//ALWAYS UPDATE SUB_URL everytime webhook url changes
export const updateSubscriptionUrl = async (data: {
  appId: string;
  subscriptionId: number;
  url: string;
}) => {
  const payload = {url: data.url};
  return requestAppJson<{status: string}>(
    data.appId,
    `app/${data.appId}/subscription/${data.subscriptionId}`,
    {
      method: "PUT",
      context: "update subscription url",
      body: new URLSearchParams(payload),
    },
  );
};

export const deleteSubscriptions = async (appId: string) => {
  await requestAppJson<{status: string}>(appId, `app/${appId}/subscription`, {
    method: "DELETE",
    context: "Delete subscriptions",
  });
};
