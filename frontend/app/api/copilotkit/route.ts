import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "placeholder",
  baseURL: "https://api.groq.com/openai/v1",
});

export const POST = async (req: NextRequest) => {
  const runtime = new CopilotRuntime({
    remoteEndpoints: [],
  });

  const serviceAdapter = new OpenAIAdapter({
    openai,
    model: "llama-3.1-8b-instant",
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
