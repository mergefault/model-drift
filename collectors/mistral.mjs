import { openAICompatible } from "./common.mjs";
export default ({ token }) => openAICompatible({ url: "https://api.mistral.ai/v1/models", token, sourceUrl: "https://docs.mistral.ai/getting-started/models/models_overview/" });
