/**
 * 手写ReAct版
 *
 * 功能：
 * - ReAct 循环（Thought → Action → Observation）
 * - verbose 模式（每步格式化输出）
 * - Session 统计（步数/Token/工具调用）
 */

import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { log } from '../../../utils/global-log';
import { rawTools } from "../tools";
import { REACT_SYSTEM_PROMPT } from "../prompts/react";

//  ====== 解析 LLM 输出 ======

/** 提取 Thought 内容 */
function parseThought(text: string): string | null {
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=Action:|Final Answer:|$)/);
  return thoughtMatch ? thoughtMatch[1].trim() : null;
}

function parseAction(text: string): {tool:string; param: string} | null {
  const actionMatch = text.match(/Action:\s*(\w+)\s*\[(.+?)\]/);
  if (actionMatch) {
    return { tool: actionMatch[1], param: actionMatch[2] };
  }
  return null;
}

function isFinalAnswer(text: string): string| null {
  const finalMatch = text.match(/Final Answer:\s*(.+)/);
  return finalMatch ? finalMatch[1].trim() : null;
}

//  ====== Session 统计 ======
export interface SessionStats {
  totalSteps: number;
  toolCalls: number;
  tokenInput: number;
  tokenOutput: number;
  tokenTotal: number;
  toolCallLog: Array<{step: number; tool: string; param: string}>;
}

//  ====== Verbose 格式化输出 ======
function printStep(stepNum: number, thought: string | null, action: {tool:string; param:string} | null, observation: string | null) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  🔄 Step ${stepNum}`);
  console.log(`${'─'.repeat(50)}`);

  if (thought) {
    console.log(`  💭 Thought:  ${thought}`);
  }
  if (action) {
    console.log(`  🎯 Action:   ${action.tool}(${action.param})`);
  }
  if (observation) {
    const display = observation.length > 200 ? observation.slice(0, 200) + '...' : observation;
    console.log(`  📊 Observation: ${display}`);
  }
}

/** 打印统计面板 */
function printStats(s: SessionStats) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  📊 Session 统计`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  总步数:       ${s.totalSteps}`);
  console.log(`  工具调用:     ${s.toolCalls} 次`);
  console.log(`  Token 输入:   ${s.tokenInput.toLocaleString()}`);
  console.log(`  Token 输出:   ${s.tokenOutput.toLocaleString()}`);
  console.log(`  Token 总计:   ${(s.tokenInput + s.tokenOutput).toLocaleString()}`);
  if (s.toolCallLog.length > 0) {
    console.log(`\n  调用明细:`);
    for (const tc of s.toolCallLog) {
      console.log(`    Step ${tc.step}: ${tc.tool}(${tc.param})`);
    }
  }
  console.log(`${'═'.repeat(50)}\n`);
}

//  ====== 主循环 ======
export async function reactLoop(userQuery: string, options?: { maxSteps?: number; verbose?: boolean }) {
  const { maxSteps = 10, verbose = false } = options ?? {};

  const messages: Array<{role:string; content:string}> = [
    { role: 'system', content: REACT_SYSTEM_PROMPT() },
    { role: 'user', content: userQuery },
  ];

  // 初始化统计
  const stats: SessionStats = {
    totalSteps: 0,
    toolCalls: 0,
    tokenInput: 0,
    tokenOutput: 0,
    tokenTotal: 0,
    toolCallLog: [],
  };

  if (verbose) {
    console.log(`\n🤖 ReAct Agent [verbose 模式]`);
    console.log(`❓ Query: ${userQuery}`);
    console.log(`📋 Max Steps: ${maxSteps}\n`);
  }

  for (let step = 0; step < maxSteps; step++) {
    const result = await generateText({
      model: deepseek('deepseek-chat'),
      messages: messages as any,
    });

    const text = result.text;
    stats.totalSteps++;
    stats.tokenInput += result.usage?.inputTokens ?? 0;
    stats.tokenOutput += result.usage?.outputTokens ?? 0;

    // 日志（始终写文件）
    log(`\n === Step ${step + 1} ===`);
    log('LLM Output:\n' + text);

    // 解析 Thought / Action / Final Answer
    const thought = parseThought(text);
    const action = parseAction(text);

    // 有 Action → 执行工具
    if (action) {
      const toolFn = rawTools[action.tool];
      const observation = await toolFn({query: action.param , expression: action.param });

      stats.toolCalls++;
      stats.toolCallLog.push({ step: step + 1, tool: action.tool, param: action.param });

      log(`🔧 Tool: ${action.tool}[${action.param}]`);
      log(`📊 Observation: ${observation.results}`);

      if (verbose) {
        printStep(step + 1, thought, action, String(observation.results));
      }

      // 截断：只把到 Action 为止的内容塞回 messages
      const actionEndIndex = text.indexOf(']') + 1;
      messages.push({ role: 'assistant', content: text.substring(0, actionEndIndex) });
      messages.push({ role: 'user', content: `Observation: ${observation.results}` });

      continue;
    }

    // 没有 Action → 检查 Final Answer
    const final = isFinalAnswer(text);
    if(final){
      if (verbose) {
        printStep(step + 1, thought, null, null);
        console.log(`\n  ✅ Final Answer: ${final}`);
        printStats(stats);
      }
      log('\n✅ Final Answer: ' + final);

      // 导出 stats
      (reactLoop as any).__lastStats = stats;
      return final;
    }

    log('⚠️ No Action or Final Answer found, stopping');
    if (verbose) printStats(stats);
    (reactLoop as any).__lastStats = stats;
    return text;
  }

  log('⚠️ Max steps reached');
  if (verbose) printStats(stats);
  (reactLoop as any).__lastStats = stats;
  return 'Agent 未能在最大步数内完成任务';
}
