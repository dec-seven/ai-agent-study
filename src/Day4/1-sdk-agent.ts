import { generateText, stepCountIs, tool, ToolLoopAgent } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLocalLogger } from '../utils/logger';
dotenv.config();

// ====== 日志工具 ======
const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLocalLogger(__dirname, 'sdk-agent.log');

const calculatorTool = tool({
  description: '执行数学计算',
  inputSchema: z.object({ expression: z.string() }),
  execute: async ({ expression }) => {
    return Function('"use strict"; return (' + expression + ')')();
  }
});

const searchTool = tool({
  description: '搜索互联网获取实时消息',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const res = await fetch('https://api.bocha.cn/v1/web-search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BOCHA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
      })
    })
    const data = await res.json();
    const results = (data.data.webPages.value || [])
      .slice(0, 3)
      .map((r: { name: string; snippet: string; url: string }) => `${r.name}: ${r.snippet}`)
      .join('\n')
    return results;
  }
})


async function main() {
  const agent = new ToolLoopAgent({
    model: deepseek('deepseek-chat'),
    // instructions: `你是一个研究助手。当前日期是 ${new Date().toLocaleDateString('zh-CN')},当被问到近期/当年数据时，优先使用搜索工具获取实时信息，不要凭训练数据回答。遇到计算问题用计算器，需要实时信息用搜索。`,
    instructions: `你是一个研究助手。遇到计算问题用计算器，需要实时信息用搜索。`,
    tools: { calculator: calculatorTool, search: searchTool},
    stopWhen: stepCountIs(10)
  })

  const result = await agent.generate({
    prompt: '2025年全球电动车销量第一名是谁？他卖了多少辆？这个数字除以365天，日均销量多少？',
  })

  log('\n=== Final Answer ===');
  log(result.text);
  log(`Steps taken: ${result.steps?.length}`);
  log(`Total tokens: ${JSON.stringify(result.usage)}`);
}

main();