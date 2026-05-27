# 🐛 Agent 开发踩坑实录


> 记录学习过程中遇到的每一个坑、原因分析、解决方案。

---

## 日志

### 2026-05-26 【手动实现ReAct循环】任务 中，在查询2025年数据时，AI表示今年是2025年，查询不到2025年数据

- **原因**：LLM 知识截止日期的概念 - Knowledge Cutoff（知识截止日期）
	LLM 的训练数据有截止日期，它不知道"现在"到底是哪一年。每个 LLM 模型在训练完成的那一刻就冻结了，之后发生的任何事它都不知道。

- **解决**：在 System Prompt 里告诉模型当前日期
```ts
// ❌ 现在
system: '你是一个研究助手。...'

// ✅ 改成
system: `你是一个研究助手。当前日期是 ${new Date().toLocaleDateString('zh-CN')}。
         当被问到近期/当年数据时，优先使用搜索工具获取实时信息，
         不要凭训练数据回答。`

```

---

### 2026-05-27 【P0】ReAct 循环工具从未被调用 — **两层 Bug**

> 这是一个**渐进式排查**的典型案例：先发现表层问题，修复后暴露更隐蔽的第二层。

---

#### 第一层：LLM 自导自演（Prompt 层）

- **现象**：
  - 日志显示 `Steps taken: 1`，但 LLM 输出了 4 组 Action/Observation/Final Answer
  - 所有 `Observation` 都是 LLM 自己编造的，工具调用次数 = 0

- **原因**：
  - System Prompt 里的 ReAct 示例展示了完整的多步格式（Action→Observation→Action→...）
  - LLM 照抄示例，**一次输出整个推理链**
  - **本质：Prompt 软约束无法阻止 LLM 的补全行为**

- **解决**：
  1. 改 Prompt 示例为单步（Thought + Action），强调"停止等待 Observation"
  2. 加强制规则："每次只输出一个 Action；绝对禁止自己写 Observation"

---

#### 第二层：判断顺序错误（代码层）⚠️ 更隐蔽！

> **第一层修复后，Steps 仍然是 1。** 这才发现了真正的代码逻辑 Bug。

- **现象**：
  - Prompt 已改，LLM 输出了单个 Action + Thought
  - 但日志仍然 `Steps taken: 1`，工具未执行
  - 最终答案直接返回，跳过工具调用

- **原因**：
  ```typescript
  // ❌ 原来的判断顺序
  const action = parseAction(text);       // 找到了 Action ✅
  if (!action) { return text; }           // 没进这里

  const final = isFinalAnswer(text);      // 也找到了 Final Answer ❌
  if (final) { return final; }            // ← 直接返回！工具永远不执行！
  ```
  - **`isFinalAnswer` 在 `parseAction` 之后、工具执行之前拦截了流程**
  - LLM 即使只输出一个 Action，如果同一段文本里包含 Final Answer（或后续编造的），就会被提前返回

- **解决**：
  ```typescript
  // ✅ 修复后的判断顺序
  const action = parseAction(text);

  // ① 有 Action → 立即执行，忽略后面所有内容（包括 Final Answer）
  if (action) {
    // 执行工具...
    messages.push({ role: 'assistant', content: truncatedOutput }); // 截断，不污染上下文
    messages.push({ role: 'user', content: `Observation: ${observation}` });
    continue; // ← 进入下一轮
  }

  // ② 没有 Action → 再检查 Final Answer
  const final = isFinalAnswer(text);
  if (final) { return final; }
  ```

- **反思（核心收获）**：

| 层次 | 问题 | 防御方式 | 类比 |
|------|------|---------|------|
| **Prompt 层** | LLM 自导自演，一次输出多步 | 单步示例 + 强制规则 | "告诉人该做什么" |
| **代码层** | 判断顺序错误，Final Answer 劫持流程 | **Action 优先 + 截断上下文** | "用代码强制约束" |
| **协议层（SDK FC）** | 以上两个问题天然不存在 | 每次只能返回一个 tool_call | "从物理上不可能犯错" |

- **三层防御缺一不可**：
  - 只修 Prompt → 第二层 Bug 仍然卡住（实际踩过的坑）
  - 只修代码顺序 → LLM 多步输出的噪声会污染 messages 上下文
  - 用 SDK Function Calling → 两层都从协议层面免疫

---

### 2026-05-27 【P1】同一问题两次搜索返回不同数据口径

- **现象**：
  - 同一个问题"2025年全球电动车销量第一名"，裸写版和 SDK 版答案不同
  - 裸写版：特斯拉 Model Y 106万辆（单车型维度）
  - SDK 版：比亚迪 225万辆（厂商/品牌维度）

- **原因**：
  - **Bocha（博查）搜索结果有随机性**，不同次调用返回 Top 结果不同
  - LLM 对搜索结果的解读路径不同：裸写版采信第一条车型榜，SDK版拿到更完整的厂商数据
  - **两个结论在不同统计维度上都正确**

- **解决**：
  - 在 System Prompt 中增加数据解读规则："优先采信厂商/品牌维度的统计"
  - 可调 Bocha 搜索参数（如增加结果数量）提高搜索质量
  - 长期方案： Evaluator（评估器）做答案交叉验证

- **反思**：
  - **Tool Quality > Loop Logic**：循环修得再好，搜索源不准答案就不准
  - Agent 的可靠性瓶颈往往不在推理层，而在工具层
  - 这就是 RAG 要解决的问题之一——用可控的知识库替代不可控的实时搜索

---

## 模板

### [日期] 问题简述

- **现象**：具体报错/异常行为

- **原因**：根因分析

- **解决**：修复步骤

- **反思**：下次如何避免
  
