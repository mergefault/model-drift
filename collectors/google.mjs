import { getJson } from "../lib/http.mjs";
export default async ({ token }) => {
  const body = await getJson(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(token)}`);
  if (!Array.isArray(body.models)) throw new TypeError("expected models array");
  return body.models.map(item => ({ id: item.name.replace(/^models\//, ""), name: item.displayName, contextWindow: item.inputTokenLimit, maxOutputTokens: item.outputTokenLimit, capabilities: item.supportedGenerationMethods, source: { url: "https://ai.google.dev/gemini-api/docs/models" } }));
};
