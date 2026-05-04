import httpStatus from "http-status";
import ApiError from "./api-error";
import config from "@/config/config";
import {type Request, type Response} from "express";
import {getPartnerAccessToken} from "@/integrations/gupshup/auth";

const GUPSHUP_BASE_URL = config.gupshup.baseUrl;

interface APIResponse<T> {
  data?: T;
  message: string;
  success: boolean;
  errors?: unknown;
  statusCode: number;
}

type AuthHeader = "token" | "Authorization";

type ExternalApiEnvelope = {
  status?: string;
  message?: string;
};

type ApiClientOptions = RequestInit & {
  context: string;
};

type ControllerResult<T = unknown> = {
  data?: T;
  message?: string;
  statusCode?: number;
};

type ControllerFn = (req: Request, res: Response) => Promise<ControllerResult>;

const formatResponse = <T>(
  statusCode: number,
  message: string,
  data?: T,
  errors?: unknown,
): APIResponse<T> => {
  return {
    data,
    errors,
    message,
    statusCode,
    success: statusCode >= 200 && statusCode < 300,
  };
};

const buildRequestBody = (
  body: RequestInit["body"],
  headers: Headers,
): RequestInit["body"] => {
  if (!body) return undefined;
  if (body instanceof URLSearchParams && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }
  return body;
};

export const requestJson = async <T extends ExternalApiEnvelope>(
  url: string,
  options: ApiClientOptions,
  authHeader?: AuthHeader,
): Promise<T> => {
  const isAuth = url.includes("account/login");
  const {context, method = "GET", headers, body, ...rest} = options;

  const finalHeaders = new Headers({
    ...headers,
    ...(!isAuth && {[authHeader ?? "token"]: await getPartnerAccessToken()}),
  });

  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  const finalUrl = GUPSHUP_BASE_URL + url;
  const finalBody = buildRequestBody(body, finalHeaders);

  const res = await fetch(finalUrl, {
    ...rest,
    method,
    body: finalBody,
    headers: finalHeaders,
  });

  const raw = await res.text();
  const parsed = JSON.parse(raw);

  if (!res.ok || parsed.status === "error") {
    throw new Error(
      `${context} failed: ${res.status} ${parsed.message ?? raw.slice(0, 200)}`,
    );
  }

  return parsed;
};

const catchAsync = (handler: ControllerFn) => {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req, res);
      const status = result?.statusCode ?? httpStatus.OK;
      const message = result?.message ?? "Operation successful";

      const response = formatResponse(status, message, result.data);
      res.status(status).send(response);
    } catch (error) {
      const status =
        (error as ApiError).statusCode || httpStatus.INTERNAL_SERVER_ERROR;
      const message = (error as ApiError).message || "Internal server error";
      const errors = (error as ApiError).errors || [];
      res
        .status(status)
        .send(formatResponse(status, message, undefined, errors));
    }
  };
};

export default catchAsync;
