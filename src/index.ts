// src/index.ts
import "dotenv/config";
import {z} from "zod";
import {prisma} from "./lib/prisma";
import app from "./app";
import config from "@/config/config";
// If you add your cron later, you can start it here
// import { startReminders } from "./jobs/reminders";

const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});

const shutdown = async (signal: string) => {
  console.log(`[server] ${signal} received: shutting down...`);
  server.close(async (err) => {
    if (err) console.error("[server] error closing server:", err);
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error("[server] error during prisma disconnect:", e);
    } finally {
      process.exit(0);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
  shutdown("unhandledRejection");
});
