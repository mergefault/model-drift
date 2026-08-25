import { openAICompatible } from "./common.mjs";
export default ({ token }) => openAICompatible({ url: "https://api.x.ai/v1/models", token, sourceUrl: "https://docs.x.ai/docs/models" });
