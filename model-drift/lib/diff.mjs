const tracked = ["name", "family", "status", "releasedAt", "contextWindow", "maxOutputTokens", "modalities", "capabilities", "availability", "pricing"];
const stable = value => JSON.stringify(canonical(value));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;

export function diffSnapshots(previous, current, occurredAt) {
  const before = new Map(previous.map(model => [model.id, model]));
  const after = new Map(current.map(model => [model.id, model]));
  const events = [];
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const oldModel = before.get(id), newModel = after.get(id);
    if (!oldModel) events.push(event("MODEL_ADDED", newModel, occurredAt, null, publicModel(newModel)));
    else if (!newModel) events.push(event("MODEL_REMOVED", oldModel, occurredAt, publicModel(oldModel), null));
    else for (const field of tracked) if (stable(oldModel[field]) !== stable(newModel[field])) {
      const type = field === "pricing" ? "PRICE_CHANGED" : field === "contextWindow" ? "CONTEXT_CHANGED" : field === "status" ? "LIFECYCLE_CHANGED" : field === "availability" ? "AVAILABILITY_CHANGED" : field === "capabilities" || field === "modalities" ? "CAPABILITY_CHANGED" : "MODEL_UPDATED";
      events.push(event(type, newModel, occurredAt, oldModel[field], newModel[field], field));
    }
  }
  return events;
}

const publicModel = ({ observedAt, ...model }) => model;
const event = (type, model, occurredAt, before, after, field = null) => ({
  id: `${occurredAt}:${model.id}:${type}:${field ?? "model"}`,
  type, modelId: model.id, provider: model.provider, field, before, after, occurredAt,
  evidence: model.source
});
