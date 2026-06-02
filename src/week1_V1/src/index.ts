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

import * as readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const options = {
  mode: 'sdk',
  verbose: true
}

// ====== 分发到对应 Agent ======
async function main() {
  ;

  console.log(`\n🚀 AI Agent 启动`)
  console.log('╔══════════════════════════════╗');
  console.log('║     ReAct Agent CLI v1.0     ║');
  console.log(`║   Mode: ${options.mode} ; Verbose: ${options.verbose}  ║`);
  console.log('╠══════════════════════════════╣');
  console.log('║  工具: 计算器 | 网络搜索     ║');
  console.log('║  输入 /help 查看帮助         ║');
  console.log('║  输入 /quit 退出             ║');
  console.log('╚══════════════════════════════╝\n');

  const ask = () => {
    rl.question('🧑 You: ', async (input) => {
      if (input === '/quit') { rl.close(); return; }
      if (input === '/help') {
        console.log('命令： /raw 切换手写模式 | /sdk 切换SDK模式 | /verbose 显示思考过程 \n');
        ask(); return;
      }
      if (input === '/raw' || input === '/sdk') {
        options.mode  = input.slice(1)
        ask(); return ;
      }
      process.stdout.write('🤖 Agent: ');
      // 调用Agent
      await callAgent(input);
      ask();
    })
  }
  ask();
  // const startTime = Date.now();

  // if (options.mode === 'raw') {
  //   const { reactLoop } = await import('./agents/react-agent');

  //   const answer = await reactLoop(query, {
  //     maxSteps: 10,
  //     verbose,
  //   });

  //   if (!verbose) {
  //     // 非 verbose 模式也打印最终答案和基础统计
  //     console.log(`\n✅ Answer: ${answer}`);

  //     const stats = (reactLoop as any).__lastStats;
  //     if (stats) {
  //       console.log(`📊 步数: ${stats.totalSteps} | 工具调用: ${stats.toolCalls} | Token: ${(stats.tokenInput + stats.tokenOutput).toLocaleString()}`);
  //     }
  //   }

  // } else {
  //   const { sdkAgent } = await import('./agents/sdk-agent');

  //   const answer = await sdkAgent(query, {
  //     maxSteps: 10,
  //     verbose,
  //   });

  //   if (!verbose) {
  //     console.log(`\n✅ Answer: ${answer}`);

  //     const stats = (sdkAgent as any).__lastStats;
  //     if (stats) {
  //       console.log(`📊 步数: ${stats.totalSteps} | 工具调用: ${stats.toolCalls} | Token: ${stats.tokenTotal.toLocaleString()}`);
  //     }
  //   }
  // }

  // const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  // console.log(`⏱️  耗时: ${elapsed}s\n`);
}

const callAgent = async (query:string) => {
  if (options.mode === 'raw') {
    const { reactLoop } = await import('./agents/react-agent');

    const answer = await reactLoop(query, {
      maxSteps: 10,
      verbose: options.verbose,
    });

    if (!options.verbose) {
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
      verbose: options.verbose,
    });

    if (!options.verbose) {
      console.log(`\n✅ Answer: ${answer}`);

      const stats = (sdkAgent as any).__lastStats;
      if (stats) {
        console.log(`📊 步数: ${stats.totalSteps} | 工具调用: ${stats.toolCalls} | Token: ${stats.tokenTotal.toLocaleString()}`);
      }
    }
  }
}

main().catch(err => {
  console.error('❌ Agent 执行失败:', err.message);
  process.exit(1);
});
