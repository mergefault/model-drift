const [snapshot, history] = await Promise.all([
  fetch("data/current.json").then(requireOk).then(response => response.json()),
  fetch("data/history.json").then(requireOk).then(response => response.json())
]);
const $ = id => document.getElementById(id);
const pageSize = 30;
let page = 1;
let driftPage = 1;
const driftPageSize = 20;
const fmtDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const fmtTokens = value => value ? new Intl.NumberFormat(undefined, { notation: "compact" }).format(value) : "—";
const money = value => value === null ? "—" : `$${Number(value).toFixed(value < 1 ? 3 : 2)}`;
function requireOk(response) { if (!response.ok) throw new Error(`Data request failed: ${response.status}`); return response; }

const cutoff = Date.now() - 30 * 864e5;
const recent = history.filter(event => Date.parse(event.occurredAt) >= cutoff);
const providers = new Set(snapshot.models.map(model => model.provider));
const activityGroups = [
  { id: "models", label: "Models", color: "#63e6be", types: ["MODEL_ADDED", "MODEL_REMOVED", "MODEL_UPDATED"] },
  { id: "pricing", label: "Pricing", color: "#ffd166", types: ["PRICE_CHANGED"] },
  { id: "lifecycle", label: "Lifecycle", color: "#ff7b72", types: ["LIFECYCLE_CHANGED", "AVAILABILITY_CHANGED"] },
  { id: "capability", label: "Capabilities", color: "#8b9cff", types: ["CONTEXT_CHANGED", "CAPABILITY_CHANGED"] }
];
$("updated").textContent = snapshot.checkedAt ? `Last checked ${fmtDate(snapshot.checkedAt)}` : "Awaiting first collection";
$("metrics").innerHTML = [[providers.size, "Providers observed"], [snapshot.models.length, "Models observed"], [recent.filter(event => event.type === "MODEL_ADDED").length, "New · 30d"], [recent.length, "Changes · 30d"]].map(([number, label]) => `<article class="metric"><strong>${number}</strong><span>${label}</span></article>`).join("");

const runs = Array.isArray(snapshot.runs) ? snapshot.runs : [];
$("health").innerHTML = runs.map(run => `<article class="health-item"><span class="health-dot ${escape(run.status)}"></span><div><strong>${escape(run.provider)}</strong><small>${escape(runSummary(run))}</small></div></article>`).join("");
const days = Array.from({ length: 30 }, (_, index) => {
  const day = new Date(Date.now() - (29 - index) * 864e5).toISOString().slice(0, 10);
  const events = recent.filter(event => event.occurredAt.startsWith(day));
  return { day, counts: Object.fromEntries(activityGroups.map(group => [group.id, events.filter(event => group.types.includes(event.type)).length])), total: events.length };
});
$("activity").innerHTML = activityChart(days);
for (const provider of [...providers].sort()) $("provider").insertAdjacentHTML("beforeend", `<option>${escape(provider)}</option>`);

function renderModels() {
  const query = $("search").value.toLowerCase(), provider = $("provider").value, kind = $("kind").value, status = $("status").value, includeSnapshots = $("snapshots").checked;
  const filtered = snapshot.models.filter(model => (!query || `${model.name} ${model.id}`.toLowerCase().includes(query)) && (!provider || model.provider === provider) && (!kind || classify(model) === kind) && (!status || model.status === status) && (includeSnapshots || !isDatedSnapshot(model)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages);
  const start = (page - 1) * pageSize;
  const models = filtered.slice(start, start + pageSize);
  $("models").innerHTML = models.map(model => `<tr><td>${escape(model.provider)}</td><td>${escape(model.name)}${snapshotCount(model) ? `<small class="versions">${snapshotCount(model)} dated version${snapshotCount(model) === 1 ? "" : "s"}</small>` : ""}</td><td>${escape(classify(model))}</td><td>${fmtTokens(model.contextWindow)}</td><td>${escape([...model.modalities.input, ...model.modalities.output].join(", ") || "—")}</td><td><span class="status">${escape(model.status)}</span></td><td><a href="${safeUrl(model.source.url)}" rel="noreferrer">source ↗</a></td></tr>`).join("");
  $("model-count").textContent = filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}` : "0 models";
  $("prev").disabled = page === 1; $("next").disabled = page === pages; $("empty-models").hidden = models.length > 0;
}
for (const id of ["search", "provider", "kind", "status", "snapshots"]) $(id).addEventListener("input", () => { page = 1; renderModels(); });
$("prev").addEventListener("click", () => { page--; renderModels(); });
$("next").addEventListener("click", () => { page++; renderModels(); });
renderModels();

const priced = snapshot.models.filter(model => [model.pricing.input, model.pricing.cachedInput, model.pricing.output, model.pricing.batchInput, model.pricing.batchOutput].some(value => value !== null));
$("pricing").innerHTML = priced.map(model => `<tr><td>${escape(model.provider)}</td><td>${escape(model.name)}</td><td>${money(model.pricing.input)}</td><td>${money(model.pricing.cachedInput)}</td><td>${money(model.pricing.output)}</td><td>${money(model.pricing.batchInput)}</td><td>${money(model.pricing.batchOutput)}</td></tr>`).join("");
$("empty-pricing").hidden = priced.length > 0;
installDriftTable();
renderDrift();

function runSummary(run) { if (run.status === "succeeded") return `${run.models} models`; if (run.status === "failed") return run.error || "collection failed"; return run.reason || run.status; }
function activityChart(values) {
  const width = 900, height = 160, baseline = 112, chartHeight = 86, step = width / values.length, barWidth = Math.max(4, step - 7), maximum = Math.max(1, ...values.map(value => value.total));
  const bars = values.map((value, index) => {
    const x = index * step + (step - barWidth) / 2;
    let y = baseline;
    return activityGroups.map(group => {
      const count = value.counts[group.id];
      if (!count) return "";
      const segmentHeight = Math.max(2, count / maximum * chartHeight);
      y -= segmentHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${segmentHeight}" fill="${group.color}"><title>${value.day} · ${group.label}: ${count}</title></rect>`;
    }).join("");
  }).join("");
  const labels = values.map((value, index) => index % 5 === 0 || index === values.length - 1 ? `<text x="${index * step + step / 2}" y="136" fill="#8fa0ad" font-size="10" text-anchor="middle">${value.day.slice(5)}</text>` : "").join("");
  const legend = activityGroups.map((group, index) => `<g transform="translate(${index * 150},154)"><circle cx="4" cy="-3" r="4" fill="${group.color}"/><text x="14" y="0" fill="#8fa0ad" font-size="10">${group.label}</text></g>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Stacked 30-day activity by change type"><line x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" stroke="#26313a"/>${bars}${labels}${legend}</svg>`;
}

function installDriftTable() {
  const style = document.createElement("style");
  style.textContent = `.drift-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.drift-toolbar input,.drift-toolbar select{min-width:180px}.drift-table{overflow:auto;border:1px solid var(--line)}.drift-table table{min-width:820px}.event-type{display:inline-block;border:1px solid var(--line);padding:3px 7px;font-size:.66rem;letter-spacing:.05em}.change-detail{max-width:360px;color:var(--muted)}.drift-pager{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:.75rem}.drift-pager button{border:1px solid var(--line);background:var(--panel);color:var(--text);padding:8px 12px;font:inherit}.drift-pager button:disabled{opacity:.35}`;
  document.head.append(style);
  $("drift").insertAdjacentHTML("beforebegin", `<div class="drift-toolbar"><input id="drift-search" type="search" placeholder="Search recent drift" aria-label="Search recent drift"><select id="drift-provider" aria-label="Filter drift provider"><option value="">All providers</option>${[...new Set(history.map(event => event.provider))].sort().map(provider => `<option>${escape(provider)}</option>`).join("")}</select><select id="drift-type" aria-label="Filter drift type"><option value="">All change types</option>${[...new Set(history.map(event => event.type))].sort().map(type => `<option value="${escape(type)}">${escape(type.replaceAll("_", " "))}</option>`).join("")}</select></div>`);
  $("drift").className = "drift-table";
  $("drift").insertAdjacentHTML("afterend", `<div class="drift-pager"><p id="drift-count"></p><div><button id="drift-prev" type="button">Previous</button><button id="drift-next" type="button">Next</button></div></div>`);
  for (const id of ["drift-search", "drift-provider", "drift-type"]) $(id).addEventListener("input", () => { driftPage = 1; renderDrift(); });
  $("drift-prev").addEventListener("click", () => { driftPage--; renderDrift(); });
  $("drift-next").addEventListener("click", () => { driftPage++; renderDrift(); });
}

function renderDrift() {
  const query = $("drift-search").value.toLowerCase(), provider = $("drift-provider").value, type = $("drift-type").value;
  const filtered = [...history].reverse().filter(event => (!query || `${event.modelId} ${event.field || ""} ${event.type}`.toLowerCase().includes(query)) && (!provider || event.provider === provider) && (!type || event.type === type));
  const pages = Math.max(1, Math.ceil(filtered.length / driftPageSize));
  driftPage = Math.min(driftPage, pages);
  const start = (driftPage - 1) * driftPageSize, events = filtered.slice(start, start + driftPageSize);
  $("drift").innerHTML = events.length ? `<table><thead><tr><th>Date</th><th>Change</th><th>Provider</th><th>Model</th><th>Field</th><th>Evidence</th></tr></thead><tbody>${events.map(event => `<tr><td>${fmtDate(event.occurredAt)}</td><td><span class="event-type">${escape(event.type.replaceAll("_", " "))}</span></td><td>${escape(event.provider)}</td><td>${escape(event.modelId)}</td><td class="change-detail">${escape(event.field || "—")}</td><td><a href="${safeUrl(event.evidence.url)}" rel="noreferrer">source ↗</a></td></tr>`).join("")}</tbody></table>` : "";
  $("drift-count").textContent = filtered.length ? `${start + 1}–${Math.min(start + driftPageSize, filtered.length)} of ${filtered.length}` : "0 changes";
  $("drift-prev").disabled = driftPage === 1;
  $("drift-next").disabled = driftPage === pages;
  $("empty-drift").hidden = events.length > 0;
}
function isDatedSnapshot(model) { return /(?:^|[-_.])20\d{2}(?:[-_.]?\d{2}){0,2}$/.test(model.name) || /(?:^|[-_.])\d{4}$/.test(model.name); }
function classify(model) { const value = `${model.id} ${model.name}`.toLowerCase(); if (/embed/.test(value)) return "embedding"; if (/moderation|safety/.test(value)) return "moderation"; if (/tts|whisper|transcri|audio|speech|voice/.test(value)) return "audio"; if (/image|dall-e|imagen|sora|video|veo/.test(value)) return "image"; if (/rerank|classif|aqa|research|computer-use/.test(value)) return "specialized"; return "generation"; }
function snapshotCount(model) { if (isDatedSnapshot(model)) return 0; const stem = model.name.replace(/[-_.](latest|preview|experimental|exp)$/i, ""); return snapshot.models.filter(candidate => candidate.provider === model.provider && candidate.id !== model.id && isDatedSnapshot(candidate) && candidate.name.startsWith(stem)).length; }
function escape(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
function safeUrl(value) { try { const url = new URL(value); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; } }
