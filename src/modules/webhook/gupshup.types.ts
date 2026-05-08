export interface GupshupV3WebhookBody {
  gs_app_id: string;
  object?: string;
  entry: Array<{
    id?: string;
    changes: Array<{
      field: string;

      value?: {
        messaging_product?: "whatsapp";
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };

        payload: {status: string};

        contacts?: Array<{
          profile?: {name?: string};
          wa_id?: string;
        }>;

        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string | number;
          type?: string;
          text?: {body?: string};
        }>;

        statuses?: Array<{
          gs_id?: string;
          id?: string;
          recipient_id?: string;
          status?: string;
          timestamp?: string | number;
          errors?: Array<{code?: number; title?: string; href?: string}>;
        }>;
      };
    }>;
  }>;
}

export interface GupshupSystemEventBody {
  type: "template-event" | "account-event" | "onboarding-event" | string;
  app?: string;
  appId?: string;
  phone?: string;
  timestamp?: number;
  version?: number;
  payload?: unknown;
}
