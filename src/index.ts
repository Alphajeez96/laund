// src/index.ts
import "dotenv/config";
import {z} from "zod";
import {prisma} from "./lib/prisma";
import app from "./app";
// If you add your cron later, you can start it here
// import { startReminders } from "./jobs/reminders";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
});

const env = envSchema.parse(process.env);

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});

// Graceful shutdown (important for Prisma and node-cron)
async function shutdown(signal: string) {
  console.log(`[server] ${signal} received: shutting down...`);
  server.close(async (err) => {
    if (err) console.error("[server] error closing server:", err);
    try {
      // Prisma will reuse pools; disconnect on shutdown only
      await prisma.$disconnect();
    } catch (e) {
      console.error("[server] error during prisma disconnect:", e);
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
  shutdown("unhandledRejection");
});
