import "dotenv/config";
import {getAppDetails} from "@/integrations/gupshup/onboarding-ops";

const appId = process.argv[2];
if (!appId)
  throw new Error(
    "Pass appId: pnpm tsx scripts/test-get-app-details.ts <appId>",
  );

const res = await getAppDetails(appId);
console.dir(res, {depth: null});
