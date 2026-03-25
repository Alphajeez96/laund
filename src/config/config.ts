import {z} from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const env = envSchema.parse(process.env);

export default {
  port: env.PORT,
  env: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
};
