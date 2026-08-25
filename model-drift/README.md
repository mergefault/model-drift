# model-drift

Source-backed tracking of AI model releases, lifecycle, capabilities, availability, and comparable token pricing.

The repository runs provider collectors once per day, validates and normalizes their output, computes deterministic field-level changes, and publishes the resulting JSON through a dependency-free GitHub Pages dashboard.

## Coverage

Collectors use official authenticated model-list APIs. OpenAI, Anthropic, Google Gemini, xAI, DeepSeek, Mistral, and Cohere are configured; each runs only when its repository secret is present. Meta/Llama, Qwen, Kimi, MiniMax, and Zhipu/GLM remain explicitly disabled until a stable authoritative source is configured.

An enabled provider does not imply complete metadata. Model-list APIs commonly omit context, lifecycle, capabilities, and pricing. Missing values remain `null`; the project does not infer them or copy third-party aggregations. Prices use USD per one million tokens only when directly comparable, with separate input, cached-input, output, batch-input, and batch-output fields.

## Collection

```text
official provider API → collector → validation → normalization → deterministic diff
                                                            ├── data/current.json
                                                            ├── data/history.json
                                                            └── docs/data/*.json
```

Each provider is isolated. A timeout, authentication failure, or changed response shape preserves that provider's last successful records while other collectors continue. The run report records success, failure, skip, or disabled status. Writes are atomic. Events carry an evidence URL from the model record.

The scheduled workflow uses Node 24, serializes collection with a concurrency group, grants only `contents: write`, and commits only when generated data changes.

## Run locally

No install step is required.

```sh
npm test
npm run collect
npm run generate
```

Set any supported API keys in the environment before collection. A missing key skips that provider without failing the run. Serve `docs/` with any static HTTP server to view the dashboard.

## Add a provider

Add one entry to `config/providers.json` and one `collectors/<id>.mjs` module. A collector returns provider-native observations with an authoritative `source.url`; `scripts/collect.mjs` owns validation, normalization, diffing, persistence, and failure isolation. Do not enable a collector backed by search results, a third-party catalog, manually maintained model lists, or guessed metadata.

## Data notes

`MODEL_REMOVED` means a model disappeared from a successful authoritative listing; it does not necessarily mean the provider retired it. Source APIs can be incomplete or change without notice. The history is append-only in normal operation, but Git remains the underlying audit trail.

## License

MIT
