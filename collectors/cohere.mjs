import { getJson } from "../lib/http.mjs";
export default async ({ token }) => {
  const body = await getJson("https://api.cohere.com/v1/models?page_size=1000", { headers: { authorization: `Bearer ${token}` } });
  if (!Array.isArray(body.models)) throw new TypeError("expected models array");
  return body.models.map(item => ({ id: item.name, contextWindow: item.context_length, capabilities: item.endpoints, source: { url: "https://docs.cohere.com/docs/models" } }));
};
