import ollama from "ollama";
import config from "@/config/config";
import {buildSystemPrompt} from "./assistant.prompt";
import {
  ASSISTANT_INTENTS,
  LlmEnvelopeSchema,
  type LlmEnvelope,
} from "./assistant.validation";
import logger from "@/utils/logger";

const assistantFormatSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "confidence", "args", "reply", "missing"],
  properties: {
    args: {type: "object"},
    reply: {type: "string"},
    confidence: {type: "number"},
    missing: {type: "array", items: {type: "string"}},
    intent: {type: "string", enum: [...Object.values(ASSISTANT_INTENTS)]},
  },
} as const;

const unknownFallback = (reply: string): LlmEnvelope => {
  return {
    reply,
    args: {},
    missing: [],
    confidence: 0,
    intent: "unknown",
  };
};

export const interpretMessage = async (text: string): Promise<LlmEnvelope> => {
  try {
    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const systemPrompt = buildSystemPrompt(todayIsoDate);

    const res = await ollama.chat({
      model: config.activeLLM,
      options: {temperature: 0},
      format: assistantFormatSchema,
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: text},
      ],
    });

    const raw = res.message?.content ?? "";
    logger("LLM RESP", raw);
    return LlmEnvelopeSchema.parse(JSON.parse(raw));
  } catch (err) {
    return unknownFallback(
      "Sorry I couldn't interpret that request. Please rephrase and include any key details",
    );
  }
};
