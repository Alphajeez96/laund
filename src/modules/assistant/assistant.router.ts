import logger from "@/utils/logger";
import {type LlmEnvelope} from "./assistant.validation";
import {
  assistantIntentHandlers,
  type AssistantContext,
  type AssistantExecutionResult,
} from "./assistant.handler";

export const executeAssistantIntent = (
  ctx: AssistantContext,
  envelope: LlmEnvelope,
): Promise<AssistantExecutionResult> => {
  const handler = assistantIntentHandlers[envelope.intent];
  if (!handler) {
    logger("Unhandled intent", {ctx, envelope});
  }
  return handler(ctx, envelope);
};
