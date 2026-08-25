import { cp, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSnapshot } from "../lib/schema.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const current = validateSnapshot(JSON.parse(await readFile(resolve(root, "data/current.json"), "utf8")));
JSON.parse(await readFile(resolve(root, "data/history.json"), "utf8"));
if (!process.argv.includes("--check")) {
  await mkdir(resolve(root, "docs/data"), { recursive: true });
  await cp(resolve(root, "data/current.json"), resolve(root, "docs/data/current.json"));
  await cp(resolve(root, "data/history.json"), resolve(root, "docs/data/history.json"));
}
console.log(`validated ${current.models.length} models`);
