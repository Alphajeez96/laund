export type PartnerAppTokenResponse = {
  status?: string;
  message?: string;
  token?: {
    token?: string;
  };
};

export type PartnerLoginResponse = {
  token?: string;
  status?: string;
  message?: string;
};

export type MediaType = "image" | "video" | "audio" | "document";
