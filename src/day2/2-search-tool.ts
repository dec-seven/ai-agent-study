import { tool } from 'ai';
import { z } from 'zod';

export const searchTool = tool({
  description: '搜索互联网获取实时信息。当需要最新数据或事实核查时使用',
  inputSchema: z.object({
    query: z.string().describe('搜索查询词'),
  }),
  // 接收工具调用的输入参数
  execute: async ({ query }) => {
    const apiKey = process.env.BOCHA_API_KEY
    const res = await fetch('https://api.bocha.cn/v1/web-search',{
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query, 
      })
    })
    const data = await res.json();
    console.log("status:", data.code);
    
    const results = (data.data.webPages.value || []).slice(0,5).map((r: { name: string; snippet: string; url: string }) => ({
        title: r.name,
        content: r.snippet,
        url: r.url
      }))
    console.log("results:", results);
    
    return { results }
  }
})