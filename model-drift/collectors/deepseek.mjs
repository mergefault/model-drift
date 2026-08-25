import { openAICompatible } from "./common.mjs";
export default ({ token }) => openAICompatible({ url: "https://api.deepseek.com/models", token, sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing" });
