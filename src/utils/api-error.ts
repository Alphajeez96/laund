type UpstreamErrorMeta = {
  context: string;
  url: string;
  method: string;
  status: number;
  body: unknown;
  raw: string;
};

type ApiErrorOptions = {
  isOperational?: boolean;
  errors?: {path: string; message: string}[];
  upstream?: UpstreamErrorMeta;
};

class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors: {path: string; message: string}[] | undefined;
  upstream?: UpstreamErrorMeta;

  constructor(
    statusCode: number,
    message: string | undefined,
    options?: ApiErrorOptions,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = options?.errors;
    this.isOperational = options?.isOperational ?? true;
    this.upstream = options?.upstream;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
