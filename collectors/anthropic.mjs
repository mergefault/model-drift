import { getJson } from "../lib/http.mjs";
export default async ({ token }) => {
  const body = await getJson("https://api.anthropic.com/v1/models?limit=1000", { headers: { "x-api-key": token, "anthropic-version": "2023-06-01" } });
  if (!Array.isArray(body.data)) throw new TypeError("expected data array");
  return body.data.map(item => ({ id: item.id, name: item.display_name, releasedAt: item.created_at ?? null, source: { url: "https://docs.anthropic.com/en/docs/about-claude/models/overview" } }));
};
