import {z} from "zod";
import "dotenv/config";

const envSchema = z.object({
  ACTIVE_LLM: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  RESIDENT_APP_ID: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GUPSHUP_API_VERSION: z.string(),
  GUPSHUP_WEBHOOK_URL: z.string(),
  GUPSHUP_BASE_URL: z.string().min(1),
  GUPSHUP_CLIENT_SECRET: z.string().min(1),
  GUPSHUP_WEBHOOK_SECRET: z.string().min(1),
  GUPSHUP_PARTNER_EMAIL: z.string().optional(),
  STT_SERVICE_URL: z.string().default("http://localhost:8000"),
});

const env = envSchema.parse(process.env);

export default {
  port: env.PORT,
  env: env.NODE_ENV,
  activeLLM: env.ACTIVE_LLM,
  databaseUrl: env.DATABASE_URL,
  sttServiceUrl: env.STT_SERVICE_URL,
  residentAppId: env.RESIDENT_APP_ID,
  gupshup: {
    baseUrl: env.GUPSHUP_BASE_URL,
    webhookUrl: env.GUPSHUP_WEBHOOK_URL,
    apiVersion: env.GUPSHUP_API_VERSION,
    partnerEmail: env.GUPSHUP_PARTNER_EMAIL,
    clientSecret: env.GUPSHUP_CLIENT_SECRET,
    webhookSecret: env.GUPSHUP_WEBHOOK_SECRET,
  },
};
