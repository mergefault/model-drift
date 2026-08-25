import test from "node:test";import assert from "node:assert/strict";import { normalizeModel } from "../lib/normalize.mjs";import { diffSnapshots } from "../lib/diff.mjs";
const provider={id:"example",name:"Example"},at="2026-01-01T00:00:00.000Z";
const model=overrides=>normalizeModel({id:"model-1",source:{url:"https://example.com/models"},...overrides},provider,at);
test("normalization is deterministic and null-preserving",()=>{const value=model({capabilities:["tools","tools"],contextWindow:0});assert.equal(value.id,"example:model-1");assert.equal(value.contextWindow,null);assert.deepEqual(value.capabilities,["tools"]);assert.equal(value.pricing.input,null)});
test("diff classifies pricing and context changes",()=>{const before=model({contextWindow:1000,pricing:{input:2}}),after=model({contextWindow:2000,pricing:{input:1}});assert.deepEqual(diffSnapshots([before],[after],at).map(e=>e.type),["CONTEXT_CHANGED","PRICE_CHANGED"])});
test("diff ordering is stable",()=>{const events=diffSnapshots([],[model({id:"z"}),model({id:"a"})],at);assert.deepEqual(events.map(e=>e.modelId),["example:a","example:z"])});
