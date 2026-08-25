import { validateModel } from "./schema.mjs";

const nullableInteger = value => Number.isInteger(value) && value > 0 ? value : null;
const strings = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [])].sort();

export function normalizeModel(raw, provider, observedAt) {
  const id = String(raw.id ?? "").trim();
  const source = raw.source ?? {};
  return validateModel({
    id: `${provider.id}:${id}`,
    provider: provider.id,
    name: String(raw.name ?? id).trim(),
    family: raw.family ? String(raw.family) : null,
    status: raw.status ?? "active",
    releasedAt: raw.releasedAt ?? null,
    contextWindow: nullableInteger(raw.contextWindow),
    maxOutputTokens: nullableInteger(raw.maxOutputTokens),
    modalities: { input: strings(raw.modalities?.input), output: strings(raw.modalities?.output) },
    capabilities: strings(raw.capabilities),
    availability: strings(raw.availability),
    pricing: {
      currency: "USD", unit: "million_tokens",
      input: raw.pricing?.input ?? null, cachedInput: raw.pricing?.cachedInput ?? null,
      output: raw.pricing?.output ?? null, batchInput: raw.pricing?.batchInput ?? null,
      batchOutput: raw.pricing?.batchOutput ?? null,
      source: raw.pricing?.source ?? null, observedAt: raw.pricing?.observedAt ?? null
    },
    source: { url: source.url, label: source.label ?? `${provider.name} API` },
    observedAt
  });
}

export function normalizeModels(models) {
  return [...models].sort((a, b) => a.id.localeCompare(b.id));
}
