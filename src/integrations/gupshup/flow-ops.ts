import {requestAppJson} from "@/utils/catch-async";

/**
 * Flow Management APIs
 *
 * Docs:
 * - Get Started Guide: https://partner-docs.gupshup.io/docs/get-started-guide-with-gupshup-flow-management-apis
 * - API Reference: https://partner-docs.gupshup.io/reference/flow-management
 *
 * Notes:
 * - Create/Update endpoints use JSON bodies (`Content-Type: application/json`).
 * - Update Flow JSON uploads a `.json` file as multipart `file`.
 */

export type GupshupFlowSummary = {
  id: string;
  name: string;
  status: string;
  categories: string[];
  validation_errors?: unknown[];
};

export type CreateFlowInput = {
  appId: string;
  name: string;
  categories: string[];
};

// export type CreateFlowResponse = {
//   status?: string;
//   message?: string;
//   /** Meta Flow ID. */
//   id?: string;
// };

/**
  Meta Flow categories (validated by Meta when creating flows).
 */
export enum FLOW_CATEGORIES {
  SIGN_UP = "SIGN_UP",
  CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT",
}

export const createFlow = async (data: CreateFlowInput) => {
  const {appId, ...payload} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows`,
    {
      method: "POST",
      context: "create flow",
      body: JSON.stringify(payload),
    },
    "token",
  );
};

export const getAllFlows = async (appId: string) => {
  return requestAppJson<GupshupFlowSummary[]>(
    appId,
    `app/${encodeURIComponent(appId)}/flows`,
    {context: "get all flows"},
    "token",
  );
};

export const getFlow = async (data: {
  appId: string;
  flowId: string;
  fields?: string;
}) => {
  const {appId, flowId, fields} = data;
  const qs = fields ? `?fields=${encodeURIComponent(fields)}` : "";
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}${qs}`,
    {context: "get flow"},
    "token",
  );
};

export const updateFlow = async (data: {
  appId: string;
  flowId: string;
  name?: string;
  categories?: string[];
}) => {
  const {appId, flowId, ...payload} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}`,
    {
      method: "PUT",
      context: "update flow",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    },
    "token",
  );
};

export const getFlowJson = async (data: {appId: string; flowId: string}) => {
  const {appId, flowId} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}/assets`,
    {context: "get flow json"},
    "token",
  );
};

export const updateFlowJson = async (data: {
  appId: string;
  flowId: string;
  /** Raw flow JSON object (will be JSON.stringify'd) or JSON string. */
  flowJson: unknown;
  /** Filename sent in multipart form. Defaults to `flow.json`. */
  filename?: string;
}) => {
  const {appId, flowId, flowJson, filename = "flow.json"} = data;

  const raw =
    typeof flowJson === "string" ? flowJson : JSON.stringify(flowJson);
  const form = new FormData();
  form.set("file", new Blob([raw], {type: "application/json"}), filename);

  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}/assets`,
    {
      method: "PUT",
      context: "update flow json",
      body: form,
    },
    "token",
  );
};

export const getPreviewUrl = async (data: {appId: string; flowId: string}) => {
  const {appId, flowId} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}/preview`,
    {context: "get preview url"},
    "token",
  );
};

export const publishFlow = async (data: {appId: string; flowId: string}) => {
  const {appId, flowId} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}/publish`,
    {method: "POST", context: "publish flow"},
    "token",
  );
};

export const deprecateFlow = async (data: {appId: string; flowId: string}) => {
  const {appId, flowId} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}/deprecate`,
    {method: "POST", context: "deprecate flow"},
    "token",
  );
};

export const deleteFlow = async (data: {appId: string; flowId: string}) => {
  const {appId, flowId} = data;
  return requestAppJson<Record<string, unknown>>(
    appId,
    `app/${encodeURIComponent(appId)}/flows/${encodeURIComponent(flowId)}`,
    {method: "DELETE", context: "delete flow"},
    "token",
  );
};
