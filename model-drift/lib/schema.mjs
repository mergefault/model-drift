const statuses = new Set(["active", "deprecated", "retired", "unknown"]);

export function validateModel(model) {
  const required = ["id", "provider", "name", "status", "observedAt"];
  for (const key of required) if (typeof model[key] !== "string" || !model[key]) throw new TypeError(`model.${key} is required`);
  if (!statuses.has(model.status)) throw new TypeError(`invalid status: ${model.status}`);
  if (!URL.canParse(model.source.url)) throw new TypeError("model.source.url must be absolute");
  if (!Number.isFinite(Date.parse(model.observedAt))) throw new TypeError("model.observedAt must be ISO-8601");
  for (const key of ["contextWindow", "maxOutputTokens"]) if (model[key] !== null && (!Number.isInteger(model[key]) || model[key] < 1)) throw new TypeError(`model.${key} must be a positive integer or null`);
  for (const key of ["input", "cachedInput", "output", "batchInput", "batchOutput"]) {
    const value = model.pricing[key];
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new TypeError(`pricing.${key} must be non-negative or null`);
  }
  return model;
}

export function validateSnapshot(snapshot) {
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.models) || !Array.isArray(snapshot.runs)) throw new TypeError("invalid snapshot envelope");
  snapshot.models.forEach(validateModel);
  return snapshot;
}
