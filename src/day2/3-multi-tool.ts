import { generateText, stepCountIs } from 'ai'
import { deepseek } from '@ai-sdk/deepseek';
import { calculatorTool } from './1-calculator-tool';
import { searchTool } from './2-search-tool';

async function main() {
  const result = await generateText({
    model: deepseek('deepseek-chat'),
    system: '你是一个研究助手。需要计算时用计算器，需要实时信息时用搜索。',
    prompt: '2024年全球AI市场规模是多少？如果年增长35%，2026年是多少？',
    tools: { calculator: calculatorTool, search: searchTool },
    stopWhen: stepCountIs(10),
    onStepFinish: (step) => {
      console.log('Step toolCalls:', JSON.stringify(step.toolCalls, null, 2));
    },
  });
}

main();

