import { openAICompatible } from "./common.mjs";
export default ({ token }) => openAICompatible({ url: "https://api.openai.com/v1/models", token, sourceUrl: "https://platform.openai.com/docs/models" });
