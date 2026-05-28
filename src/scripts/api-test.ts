import "dotenv/config";
import {readFile} from "node:fs/promises";
import path from "node:path";

import config from "@/config/config";
import logger from "@/utils/logger";
import {
  createFlow,
  deleteFlow,
  deprecateFlow,
  getAllFlows,
  getFlow,
  getFlowJson,
  getPreviewUrl,
  publishFlow,
  updateFlow,
  updateFlowJson,
} from "@/integrations/gupshup/flow-ops";
import {
  getSubscriptions,
  updateSubscriptionUrl,
} from "@/integrations/gupshup/subscription-ops";

const DEFAULT_FLOW_JSON_PATH =
  "src/integrations/gupshup/flows/laundryops-signup.flow.json";

function help(): void {
  console.log(
    [
      "Usage:",
      "  pnpm tsx src/scripts/api-test.ts <fnName> [appId] [...args]",
      "",
      "Flow management fns:",
      '  createFlow [appId] "<name?>" "SIGN_UP,OTHER"',
      "  getAllFlows [appId]",
      "  getFlow [appId] <flowId>",
      '  updateFlow [appId] <flowId> "<name?>" "SIGN_UP,OTHER"',
      "  getFlowJson [appId] <flowId>",
      "  updateFlowJson [appId] <flowId> <jsonPath?>",
      "  getPreviewUrl [appId] <flowId>",
      "  publishFlow [appId] <flowId>",
      "  deprecateFlow [appId] <flowId>",
      "  deleteFlow [appId] <flowId>",
      "",
      "",
      "Subscription fns:",
      "  getSubscriptions [appId]",
      "  updateSubscriptionUrl [appId] <subscriptionId> <newUrl>",
      "",
      "Notes:",
      `- If appId is omitted, defaults to RESIDENT_APP_ID (${config.residentAppId}).`,
      `- updateFlowJson defaults jsonPath to ${DEFAULT_FLOW_JSON_PATH}`,
    ].join("\n"),
  );
}

const main = async () => {
  const fnName = process.argv[2];
  if (!fnName || fnName === "help") {
    help();
    return;
  }

  const appId = process.argv[3] ?? config.residentAppId;
  if (!appId) throw new Error("Missing appId (and RESIDENT_APP_ID is not set)");

  // Arg positions: [node, script, fnName, appId, arg4, arg5, arg6...]
  const arg4 = process.argv[4];
  const arg5 = process.argv[5];
  const arg6 = process.argv[6];

  if (fnName === "createFlow") {
    const name = arg4 ?? "LaundryOps Signup";
    const categories = (arg5 ?? "SIGN_UP")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await createFlow({appId, name, categories});
    logger("createFlow", res);
    return;
  }

  if (fnName === "getAllFlows") {
    const res = await getAllFlows(appId);
    logger("getAllFlows", res);
    return;
  }

  if (fnName === "getFlow") {
    if (!arg4) throw new Error("getFlow requires: <flowId>");
    const res = await getFlow({appId, flowId: arg4});
    logger("getFlow", res);
    return;
  }

  if (fnName === "updateFlow") {
    if (!arg4) throw new Error("updateFlow requires: <flowId>");
    const name = arg5 ? arg5 : undefined;
    const categories = (arg6 ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await updateFlow({
      appId,
      flowId: arg4,
      ...(name ? {name} : {}),
      ...(categories.length ? {categories} : {}),
    });
    logger("updateFlow", res);
    return;
  }

  if (fnName === "getFlowJson") {
    if (!arg4) throw new Error("getFlowJson requires: <flowId>");
    const res = await getFlowJson({appId, flowId: arg4});
    logger("getFlowJson", res);
    return;
  }

  if (fnName === "updateFlowJson") {
    if (!arg4) throw new Error("updateFlowJson requires: <flowId>");
    const jsonPath = arg5 ?? DEFAULT_FLOW_JSON_PATH;
    const raw = await readFile(jsonPath, "utf8");
    const filename = path.basename(jsonPath);
    const res = await updateFlowJson({
      appId,
      flowId: arg4,
      flowJson: raw,
      filename,
    });
    logger("updateFlowJson", res);
    return;
  }

  if (fnName === "getPreviewUrl") {
    if (!arg4) throw new Error("getPreviewUrl requires: <flowId>");
    const res = await getPreviewUrl({appId, flowId: arg4});
    logger("getPreviewUrl", res);
    return;
  }

  if (fnName === "publishFlow") {
    if (!arg4) throw new Error("publishFlow requires: <flowId>");
    const res = await publishFlow({appId, flowId: arg4});
    logger("publishFlow", res);
    return;
  }

  if (fnName === "deprecateFlow") {
    if (!arg4) throw new Error("deprecateFlow requires: <flowId>");
    const res = await deprecateFlow({appId, flowId: arg4});
    logger("deprecateFlow", res);
    return;
  }

  if (fnName === "deleteFlow") {
    if (!arg4) throw new Error("deleteFlow requires: <flowId>");
    const res = await deleteFlow({appId, flowId: arg4});
    logger("deleteFlow", res);
    return;
  }

  if (fnName === "getSubscriptions") {
    const res = await getSubscriptions(appId);
    logger("getSubscriptions", res);
    return;
  }

  if (fnName === "updateSubscriptionUrl") {
    if (!arg4) throw new Error("updateSubscriptionUrl requires: <subscriptionId>");
    if (!arg5) throw new Error("updateSubscriptionUrl requires: <newUrl>");
    const res = await updateSubscriptionUrl({
      appId,
      subscriptionId: Number(arg4),
      url: arg5,
    });
    logger("updateSubscriptionUrl", res);
    return;
  }

  help();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// pnpm tsx src/scripts/api-test.ts getFlowJson b63ac773-ea4c-4350-85d3-4831b2c5993f 1293964302340252
// pnpm tsx src/scripts/api-test.ts updateFlowJson b63ac773-ea4c-4350-85d3-4831b2c5993f 1293964302340252 src/integrations/gupshup/flows/signup.json
