import { getJson } from "../lib/http.mjs";

export async function openAICompatible({ url, token, sourceUrl = url, headers = {}, map = item => ({ id: item.id }) }) {
  const body = await getJson(url, { headers: { authorization: `Bearer ${token}`, ...headers } });
  if (!Array.isArray(body.data)) throw new TypeError("expected data array");
  return body.data.map(item => ({ ...map(item), source: { url: sourceUrl } }));
}
