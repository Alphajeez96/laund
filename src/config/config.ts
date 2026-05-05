import {z} from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GUPSHUP_API_VERSION: z.string(),
  GUPSHUP_WEBHOOK_URL: z.string(),
  GUPSHUP_BASE_URL: z.string().min(1),
  GUPSHUP_WEBHOOK_SECRET: z.string().min(1),
  GUPSHUP_CLIENT_SECRET: z.string().min(1),
  GUPSHUP_PARTNER_EMAIL: z.string().optional(),
});

const env = envSchema.parse(process.env);

export default {
  port: env.PORT,
  env: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  gupshup: {
    baseUrl: env.GUPSHUP_BASE_URL,
    webhookUrl: env.GUPSHUP_WEBHOOK_URL,
    apiVersion: env.GUPSHUP_API_VERSION,
    partnerEmail: env.GUPSHUP_PARTNER_EMAIL,
    clientSecret: env.GUPSHUP_CLIENT_SECRET,
    webhookSecret: env.GUPSHUP_WEBHOOK_SECRET,
  },
};
