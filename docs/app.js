const [snapshot, history] = await Promise.all([
  fetch("data/current.json").then(requireOk).then(response => response.json()),
  fetch("data/history.json").then(requireOk).then(response => response.json())
]);
const $ = id => document.getElementById(id);
const pageSize = 30;
let page = 1;
const fmtDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const fmtTokens = value => value ? new Intl.NumberFormat(undefined, { notation: "compact" }).format(value) : "—";
const money = value => value === null ? "—" : `$${Number(value).toFixed(value < 1 ? 3 : 2)}`;
function requireOk(response) { if (!response.ok) throw new Error(`Data request failed: ${response.status}`); return response; }

const cutoff = Date.now() - 30 * 864e5;
const recent = history.filter(event => Date.parse(event.occurredAt) >= cutoff);
const providers = new Set(snapshot.models.map(model => model.provider));
$("updated").textContent = snapshot.checkedAt ? `Last checked ${fmtDate(snapshot.checkedAt)}` : "Awaiting first collection";
$("metrics").innerHTML = [[providers.size, "Providers observed"], [snapshot.models.length, "Models observed"], [recent.filter(event => event.type === "MODEL_ADDED").length, "New · 30d"], [recent.length, "Changes · 30d"]].map(([number, label]) => `<article class="metric"><strong>${number}</strong><span>${label}</span></article>`).join("");

const runs = Array.isArray(snapshot.runs) ? snapshot.runs : [];
$("health").innerHTML = runs.map(run => `<article class="health-item"><span class="health-dot ${escape(run.status)}"></span><div><strong>${escape(run.provider)}</strong><small>${escape(runSummary(run))}</small></div></article>`).join("");
const days = Array.from({ length: 30 }, (_, index) => { const day = new Date(Date.now() - (29 - index) * 864e5).toISOString().slice(0, 10); return [day, recent.filter(event => event.occurredAt.startsWith(day)).length]; });
const maximum = Math.max(1, ...days.map(([, count]) => count));
$("activity").innerHTML = activityChart(days, maximum);
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
const events = [...history].reverse().slice(0, 50);
$("drift").innerHTML = events.map(event => `<article class="event"><strong>${escape(event.type.replaceAll("_", " "))}</strong><span>${escape(event.modelId)}${event.field ? ` · ${escape(event.field)}` : ""}</span><a href="${safeUrl(event.evidence.url)}" rel="noreferrer"><time>${fmtDate(event.occurredAt)}</time> ↗</a></article>`).join("");
$("empty-drift").hidden = events.length > 0;

function runSummary(run) { if (run.status === "succeeded") return `${run.models} models`; if (run.status === "failed") return run.error || "collection failed"; return run.reason || run.status; }
function activityChart(values, maximum) {
  const width = 900, height = 132, baseline = 96, chartHeight = 76, step = width / values.length, barWidth = Math.max(4, step - 6);
  const bars = values.map(([day, count], index) => {
    const barHeight = count ? Math.max(3, count / maximum * chartHeight) : 1;
    const x = index * step + (step - barWidth) / 2;
    return `<rect x="${x}" y="${baseline - barHeight}" width="${barWidth}" height="${barHeight}" fill="${count ? "#63e6be" : "#26313a"}"><title>${day}: ${count} change${count === 1 ? "" : "s"}</title></rect>`;
  }).join("");
  const labels = values.map(([day], index) => index % 5 === 0 || index === values.length - 1 ? `<text x="${index * step + step / 2}" y="120" fill="#8fa0ad" font-size="10" text-anchor="middle">${day.slice(5)}</text>` : "").join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Daily changes from ${values[0][0]} through ${values.at(-1)[0]}"><line x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" stroke="#26313a"/>${bars}${labels}</svg>`;
}
function isDatedSnapshot(model) { return /(?:^|[-_.])20\d{2}(?:[-_.]?\d{2}){0,2}$/.test(model.name) || /(?:^|[-_.])\d{4}$/.test(model.name); }
function classify(model) { const value = `${model.id} ${model.name}`.toLowerCase(); if (/embed/.test(value)) return "embedding"; if (/moderation|safety/.test(value)) return "moderation"; if (/tts|whisper|transcri|audio|speech|voice/.test(value)) return "audio"; if (/image|dall-e|imagen|sora|video|veo/.test(value)) return "image"; if (/rerank|classif|aqa|research|computer-use/.test(value)) return "specialized"; return "generation"; }
function snapshotCount(model) { if (isDatedSnapshot(model)) return 0; const stem = model.name.replace(/[-_.](latest|preview|experimental|exp)$/i, ""); return snapshot.models.filter(candidate => candidate.provider === model.provider && candidate.id !== model.id && isDatedSnapshot(candidate) && candidate.name.startsWith(stem)).length; }
function escape(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
function safeUrl(value) { try { const url = new URL(value); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; } }
