export async function getJson(url, { headers = {}, timeoutMs = 15_000 } = {}) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "model-drift/0.1", ...headers },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}
