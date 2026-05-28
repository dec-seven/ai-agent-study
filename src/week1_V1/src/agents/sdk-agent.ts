/**
 * SDK版
 */

import { deepseek } from "@ai-sdk/deepseek";
import { stepCountIs, ToolLoopAgent } from "ai";
import { sdkTools } from "../tools";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { createLocalLogger } from "../../../utils/logger";
import { SDK_INSTRUCTIONS } from "../prompts/sdk";


// ====== 日志工具 ======
const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLocalLogger(__dirname, 'sdk-agent.log');

export async function sdkAgent(query: string) {
  const agent = new ToolLoopAgent({
    model: deepseek('deepseek-chat'),
    instructions: SDK_INSTRUCTIONS,
    tools: sdkTools,
    stopWhen: stepCountIs(10)
  })

  const result = await agent.generate({ prompt: query })

  log('\n=== Final Answer ===');
  log(result.text);
  log(`Steps taken: ${result.steps?.length}`);
  log(`Total tokens: ${JSON.stringify(result.usage)}`);
}
