import type {Request, Response} from "express";
import config from "@/config/config";
import {GupshupWebhookService} from "./gupshup.service";

const handle = (req: Request, res: Response) => {
  // const expected = config.gupshup.webhookSecret;

  // if (expected) {

  //   const got = req.header("x-gupshup-webhook-secret");
  //   if (got !== expected) {
  //     console.log("NOT RIGHTLY SENT");
  //     res.status(401).end();
  //     return;
  //   }
  // }

  res.status(204).end();

  console.info("WEBHOOK GOTTEN:::", req.body);
  // Process after ACK (never await inside the request).
  setImmediate(() => {
    void GupshupWebhookService.ingest({
      body: req.body,
      headers: req.headers,
      receivedAtMs: Date.now(),
    }).catch((err) => {
      console.error("[gupshup-webhook] ingest failed", err);
    });
  });
};

export const GupshupHookController = {
  handle,
};
