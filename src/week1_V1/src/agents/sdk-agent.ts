/**
 * SDK版
 *
 * 功能：
 * - ToolLoopAgent 封装
 * - verbose 模式（显示每步工具调用）
 * - Session 统计（步数/Token/工具调用）
 */

import { deepseek } from "@ai-sdk/deepseek";
import { stepCountIs, ToolLoopAgent } from "ai";
import { sdkTools } from "../tools";
import { dirname } from "path";
import { fileURLToPath } from "url";
// import { createLocalLogger } from "../../../utils/logger";
import { SDK_INSTRUCTIONS } from "../prompts/sdk";

// ====== 日志 ======
const __dirname = dirname(fileURLToPath(import.meta.url));
// const log = createLocalLogger(__dirname, 'sdk-agent.log');

// ====== Session 统计 ======
export interface SdkSessionStats {
  totalSteps: number;
  toolCalls: number;
  tokenInput: number;
  tokenOutput: number;
  tokenTotal: number;
  toolCallLog: Array<{step: number; tool: string}>;
}

function printSdkStats(s: SdkSessionStats, answer: string) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  📊 Session 统计 (SDK)`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  总步数:       ${s.totalSteps}`);
  console.log(`  工具调用:     ${s.toolCalls} 次`);
  console.log(`  Token 输入:   ${s.tokenInput.toLocaleString()}`);
  console.log(`  Token 输出:   ${s.tokenOutput.toLocaleString()}`);
  console.log(`  Token 总计:   ${(s.tokenInput + s.tokenOutput).toLocaleString()}`);

  if (s.toolCallLog.length > 0) {
    console.log(`\n  调用明细:`);
    for (const tc of s.toolCallLog) {
      console.log(`    Step ${tc.step}: ${tc.tool}()`);
    }
  }

  console.log(`${'─'.repeat(50)}`);
  console.log(`  ✅ Final Answer: ${answer}`);
  console.log(`${'═'.repeat(50)}\n`);
}

export async function sdkAgent(query: string, options?: { maxSteps?: number; verbose?: boolean }) {
  const { maxSteps = 10, verbose = false } = options ?? {};

  if (verbose) {
    console.log(`\n🤖 SDK Agent [verbose 模式]`);
    console.log(`❓ Query: ${query}`);
    console.log(`📋 Max Steps: ${maxSteps}\n`);
  }

  const agent = new ToolLoopAgent({
    model: deepseek('deepseek-chat'),
    instructions: SDK_INSTRUCTIONS,
    tools: sdkTools,
    stopWhen: stepCountIs(maxSteps)
  });

  const result = await agent.generate({ prompt: query });

  // 日志
  // log('\n=== SDK Agent Result ===');
  // log(result.text);
  // log(`Steps taken: ${result.steps?.length ?? 0}`);

  // 统计
  const stats: SdkSessionStats = {
    totalSteps: result.steps?.length ?? 0,
    toolCalls: 0,
    tokenInput: 0,
    tokenOutput: 0,
    tokenTotal: 0,
    toolCallLog: [],
  };

  // 遍历每步收集统计
  if (result.steps) {
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      stats.tokenInput += step.usage?.inputTokens ?? 0;
      stats.tokenOutput += step.usage?.outputTokens ?? 0;

      // 检测是否有工具调用
      const hasToolCall = step.toolCalls && step.toolCalls.length > 0;
      if (hasToolCall) {
        stats.toolCalls++;
        const toolName = step.toolCalls![0].toolName;
        stats.toolCallLog.push({ step: i + 1, tool: toolName });

        if (verbose) {
          console.log(`\n${'─'.repeat(50)}`);
          console.log(`  🔄 Step ${i + 1}`);
          console.log(`${'─'.repeat(50)}`);
          console.log(`  🎯 Action:   ${toolName}()`);
          // SDK 的 observation 在 toolResults 中
          const toolResult = step.toolResults?.[0];
          if (toolResult) {
            const display = String(toolResult).length > 200
              ? String(toolResult).slice(0, 200) + '...'
              : String(toolResult);
            console.log(`  📊 Observation: ${display}`);
          }
        }
      }
    }
  }
  stats.tokenTotal = result.usage?.totalTokens ?? (stats.tokenInput + stats.tokenOutput);

  // log(`Total tokens: ${JSON.stringify(result.usage)}`);
  // log(`Tool calls: ${stats.toolCalls}`);

  if (verbose) {
    printSdkStats(stats, result.text);
  }

  // 导出 stats
  (sdkAgent as any).__lastStats = stats;

  return result.text;
}
