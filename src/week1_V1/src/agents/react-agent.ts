/**
 * 手写ReAct版
 */

import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { log } from '../../../utils/global-log';
import { rawTools } from "../tools";
import { REACT_SYSTEM_PROMPT } from "../prompts/react";

//  ====== ReAct System Prompt（从 prompts/react.ts 导入）======

//  ====== 解析 LLM 实现 ======
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

//  ===== 主循环 =====
export async function reactLoop(userQuery: string, maxSteps = 10) {
  
  const messages: Array<{role:string; content:string}> = [
    { role: 'system', content: REACT_SYSTEM_PROMPT() },
    { role: 'user', content: userQuery },
  ];

  for (let step = 0; step < maxSteps; step++) {
    log(`\n === Step ${step + 1} ===`);
    
    const result = await generateText({
      model: deepseek('deepseek-chat'),
      messages: messages as any,
    });

    const text = result.text;
    log('LLM Output:\n' + text);

    // ① 先解析 Action（优先于 Final Answer）
    const action = parseAction(text);

    // ② 有 Action → 强制执行工具，忽略 LLM 可能编造的后续内容
    if (action) {
      const toolFn = rawTools[action.tool];
      const observation = await toolFn({query: action.param , expression: action.param });  // 直接调用纯函数

      log(`🔧 Tool: ${action.tool}[${action.param}]`);
      log(`📊 Observation: ${observation.results}`);

      // ③ 截断：只把到 Action 为止的内容塞回 messages，不污染上下文
      const actionEndIndex = text.indexOf(']') + 1;
      messages.push({ role: 'assistant', content: text.substring(0, actionEndIndex) });
      messages.push({ role: 'user', content: `Observation: ${observation.results}` });

      continue; // 进入下一轮循环
    }

    // ④ 没有 Action → 再检查 Final Answer
    const final = isFinalAnswer(text);
    if(final){
      log('\n✅ Final Answer: ' + final);
      return final;
    }

    log('⚠️ No Action or Final Answer found, stopping');
    return text;

  }

  log('⚠️ Max steps reached');
  return 'Agent 未能在最大步数内完成任务';
}