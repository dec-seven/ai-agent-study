import { generateText, stepCountIs, tool } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

export const calculatorTool = tool({
  description: '执行数学计算。支持加减乘除。',
  inputSchema: z.object({
    expression: z.string().describe('数学表达式，如 "2+3*4"'),
  }),
  execute: async ({ expression }) => {
    try {
      // 安全地用 eval
      const result = Function('"use strict"; return (' + expression + ')')();
      return { result, expression };
    } catch (e) {
      return { error: String(e), expression };
    }
  },
});

async function main() {
  const result = await generateText({
    model: deepseek('deepseek-chat'),
    system: '你是一个数学助手。遇到计算问题时使用计算器工具。',
    prompt: '计算 (123 * 456) + (789 / 3) 的结果',
    // prompt: '计算 1 + 1 的结果',
    tools: { calculator: calculatorTool },
    stopWhen: stepCountIs(5),  // 最多允许工具调用的轮数
    onStepFinish: (step) => {
      console.log('--- Step ---');
      console.log('Reasoning:', step.reasoning);
      console.log('Tool calls:', step.toolCalls);
      console.log('Tool results:', step.toolResults);
      console.log('Text so far:', step.text);
    },
  });
  console.log('Final text:', result.text);
  
}
// main();