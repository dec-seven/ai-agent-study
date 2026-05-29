/**
 * AI Agent 入口
 *
 * 用法：
 *   npx tsx src/index.ts "你的问题" [模式] [选项]
 *
 * 模式（二选一）：
 *   raw    手写 ReAct 版（自己解析 Thought/Action/Observation）
 *   sdk    SDK ToolLoopAgent 版（Vercel AI SDK 封装）
 *
 * 选项：
 *   --verbose  显示每步 Thought → Action → Observation 详情 + Session 统计
 *   -v         同上（简写）
 *
 * 示例：
 *   npx tsx src/index.ts "1+1等于几"
 *   npx tsx src/index.ts "济南今天天气" raw
 *   npx tsx src/index.ts "2024年中国GDP是多少" sdk --verbose
 *   npx tsx src/index.ts "帮我分析一下DeepSeek公司" raw -v
 */

import dotenv from 'dotenv';
dotenv.config();

// ====== 解析命令行参数 ======
const args = process.argv.slice(2);

// 提取非选项参数作为 query，选项参数单独处理
const queryIndex = args.findIndex(a => !a.startsWith('-'));
const query = queryIndex >= 0 ? args[queryIndex] : '1+1等于几';

// 模式：raw / sdk（默认 sdk）
const modeArg = args.find(a => a === 'raw' || a === 'sdk');
const mode = modeArg ?? 'sdk';

// Verbose 开关
const verbose = args.includes('--verbose') || args.includes('-v');

// ====== 分发到对应 Agent ======
async function main() {
  console.log(`\n🚀 AI Agent 启动`);
  console.log(`   模式: ${mode.toUpperCase()}${verbose ? ' | verbose' : ''}`);
  console.log(`   问题: ${query}\n`);

  const startTime = Date.now();

  if (mode === 'raw') {
    const { reactLoop } = await import('./agents/react-agent');

    const answer = await reactLoop(query, {
      maxSteps: 10,
      verbose,
    });

    if (!verbose) {
      // 非 verbose 模式也打印最终答案和基础统计
      console.log(`\n✅ Answer: ${answer}`);

      const stats = (reactLoop as any).__lastStats;
      if (stats) {
        console.log(`📊 步数: ${stats.totalSteps} | 工具调用: ${stats.toolCalls} | Token: ${(stats.tokenInput + stats.tokenOutput).toLocaleString()}`);
      }
    }

  } else {
    const { sdkAgent } = await import('./agents/sdk-agent');

    const answer = await sdkAgent(query, {
      maxSteps: 10,
      verbose,
    });

    if (!verbose) {
      console.log(`\n✅ Answer: ${answer}`);

      const stats = (sdkAgent as any).__lastStats;
      if (stats) {
        console.log(`📊 步数: ${stats.totalSteps} | 工具调用: ${stats.toolCalls} | Token: ${stats.tokenTotal.toLocaleString()}`);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱️  耗时: ${elapsed}s\n`);
}

main().catch(err => {
  console.error('❌ Agent 执行失败:', err.message);
  process.exit(1);
});
