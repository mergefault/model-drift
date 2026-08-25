import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeModel, normalizeModels } from "../lib/normalize.mjs";
import { diffSnapshots } from "../lib/diff.mjs";
import { validateSnapshot } from "../lib/schema.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const providers = JSON.parse(await readFile(resolve(root, "config/providers.json"), "utf8"));
const pricing = JSON.parse(await readFile(resolve(root, "config/pricing.json"), "utf8"));
validatePricingCatalogue(pricing);
const currentPath = resolve(root, "data/current.json"), historyPath = resolve(root, "data/history.json");
const previous = validateSnapshot(JSON.parse(await readFile(currentPath, "utf8")));
const observedAt = new Date().toISOString();
const models = previous.models.filter(model => !providers.some(provider => provider.id === model.provider && provider.enabled));
const runs = [];

for (const provider of providers) {
  if (!provider.enabled) { runs.push({ provider: provider.id, status: "disabled", reason: provider.reason }); continue; }
  const token = process.env[provider.secret];
  if (!token) { models.push(...previous.models.filter(model => model.provider === provider.id)); runs.push({ provider: provider.id, status: "skipped", reason: `Missing ${provider.secret}` }); continue; }
  try {
    const { default: collect } = await import(`../collectors/${provider.collector}.mjs`);
    const raw = await collect({ token });
    models.push(...raw.map(item => normalizeModel(item, provider, observedAt)));
    runs.push({ provider: provider.id, status: "succeeded", models: raw.length });
  } catch (error) {
    models.push(...previous.models.filter(model => model.provider === provider.id));
    runs.push({ provider: provider.id, status: "failed", error: String(error.message).slice(0, 300) });
  }
}

const nextModels = normalizeModels(models.map(model => applyPricing(model, pricing)));
// The first observation is a baseline, not evidence that every listed model launched today.
const events = previous.checkedAt === null ? [] : diffSnapshots(previous.models, nextModels, observedAt);
const history = JSON.parse(await readFile(historyPath, "utf8"));
const next = validateSnapshot({ schemaVersion: 1, checkedAt: observedAt, models: nextModels, runs });
async function atomicJson(path, value) { const temp = `${path}.tmp`; await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`); await rename(temp, path); }
await atomicJson(currentPath, next);
await atomicJson(historyPath, [...history, ...events]);
console.log(JSON.stringify({ checkedAt: observedAt, models: nextModels.length, events: events.length, runs }));

function applyPricing(model, catalogue) {
  const providerModelId = model.id.slice(model.provider.length + 1);
  const entry = catalogue.entries.find(candidate => candidate.provider === model.provider && candidate.modelIds.includes(providerModelId));
  if (!entry) return model;
  return {
    ...model,
    pricing: {
      currency: "USD",
      unit: "million_tokens",
      input: entry.input,
      cachedInput: entry.cachedInput,
      output: entry.output,
      batchInput: entry.batchInput,
      batchOutput: entry.batchOutput,
      source: entry.source,
      observedAt: catalogue.observedAt
    }
  };
}

function validatePricingCatalogue(catalogue) {
  if (catalogue.schemaVersion !== 1 || !Number.isFinite(Date.parse(catalogue.observedAt)) || !Array.isArray(catalogue.entries)) throw new TypeError("invalid pricing catalogue");
  const keys = new Set();
  for (const entry of catalogue.entries) {
    if (typeof entry.provider !== "string" || !Array.isArray(entry.modelIds) || entry.modelIds.length === 0 || !URL.canParse(entry.source)) throw new TypeError("invalid pricing entry");
    for (const field of ["input", "cachedInput", "output", "batchInput", "batchOutput"]) if (entry[field] !== null && (!Number.isFinite(entry[field]) || entry[field] < 0)) throw new TypeError(`invalid ${field} price`);
    for (const modelId of entry.modelIds) {
      const key = `${entry.provider}:${modelId}`;
      if (keys.has(key)) throw new TypeError(`duplicate pricing entry: ${key}`);
      keys.add(key);
    }
  }
}
