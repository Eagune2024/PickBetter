# Design: 渐进式 AI 反馈体验优化

## Context

当前 AI DOM 修改功能存在用户体验问题：

**现有实现**：
- `submitAiPrompt()` 是同步方法
- 元素信息提取（`extractElementInfo`）是同步操作
- 设计系统分析（`analyzePageDesignSystem`）是同步操作
- 只有在 `sendMessage()` 之后才调用 `showLoading()`

**用户流程**：
```
按 Enter
  → 提取元素信息（同步，可能很慢）
  → 发送请求（异步）
  → 显示 "AI正在思考..."
```

**问题**：
- 提取元素信息阻塞 UI 更新
- 设计系统分析（100-150ms）完全在主线程执行
- 用户等待 100-500ms 才看到任何反馈

**项目约束**：
- Content Script 必须打包为 IIFE（不能用 ES Module 的顶级 await）
- 需要支持 Chrome 和 Firefox
- 使用 webextension-polyfill 确保跨浏览器兼容

## Goals / Non-Goals

**Goals:**
1. 用户按 Enter 后 <10ms 内看到进度反馈
2. 显示动态步骤列表，实时更新每个步骤的状态
3. 根据任务类型（明确/模糊）显示不同的步骤
4. 使用微任务调度让浏览器有机会更新 UI
5. 保持向后兼容，不破坏现有功能

**Non-Goals:**
- 不修改 Background Script 或消息协议
- 不实现超时机制
- 不显示预估时间
- 不支持取消操作（Esc 仍然可以取消对话框）

## Decisions

### 决策 1：使用 async/await + 微任务调度

**选择理由**：
- `await Promise.resolve()` 创建微任务，让浏览器在下一个事件循环前更新 DOM
- 开销小（<5ms），用户体验提升明显
- 代码简洁易维护

**替代方案**：
- ❌ **Web Workers**：Content Script 中难以使用，增加复杂度
- ❌ **setTimeout(..., 0)**：宏任务，延迟更大（~4ms）
- ❌ **requestIdleCallback**：不适合用户驱动的即时反馈

**实现方式**：
```typescript
private async submitAiPrompt(): Promise<void> {
  // 立即显示 UI
  this.showProgressSteps(steps);

  // 微任务，让浏览器渲染
  await Promise.resolve();

  // 更新状态并执行操作
  steps[0].status = 'running';
  this.updateProgressSteps(steps);
  await Promise.resolve();

  // 执行实际工作
  const info = this.extractElementInfo(element);

  // 更新为完成状态
  steps[0].status = 'completed';
  this.updateProgressSteps(steps);
}
```

### 决策 2：动态步骤生成

**选择理由**：
- 明确指令和模糊指令需要不同的步骤
- 步骤数量影响 UI 布局和用户体验
- 根据 `isFuzzyPrompt()` 的返回值动态生成

**步骤定义**：

```typescript
// 明确指令（3 个步骤）
const explicitSteps = [
  { id: 'extract', label: '提取元素信息', status: 'pending' },
  { id: 'ai', label: 'AI 正在思考...', status: 'pending' },
  { id: 'apply', label: '应用修改', status: 'pending' },
];

// 模糊指令（6 个步骤）
const fuzzySteps = [
  { id: 'extract', label: '提取元素信息', status: 'pending' },
  { id: 'parent', label: '提取父元素信息', status: 'pending' },
  { id: 'siblings', label: '分析兄弟元素', status: 'pending' },
  { id: 'layout', label: '分析页面布局', status: 'pending' },
  { id: 'ai', label: 'AI 正在思考...', status: 'pending' },
  { id: 'apply', label: '应用修改', status: 'pending' },
];
```

### 决策 3：步骤状态管理

**状态枚举**：
- `pending`: 待处理（灰色圆圈 ○）
- `running`: 进行中（spinner + 蓝色高亮）
- `completed`: 已完成（绿色勾 ✓ + 变淡）
- `failed`: 失败（红色叉 ✗）

**状态流转**：
```
pending → running → completed
              ↓
            failed
```

### 决策 4：UI 设计

**布局**：
```
┌────────────────────────────────────┐
│  正在处理你的请求...              │  ← 标题（可选）
├────────────────────────────────────┤
│  ✓ 提取元素信息                  │  ← 已完成（绿色，半透明）
│  ⏳ 提取父元素信息                │  ← 进行中（蓝色，spinner）
│  ○ 分析兄弟元素                   │  ← 待处理（灰色）
│  ○ 分析页面布局                  │
│  ○ AI 正在思考...               │
│  ○ 应用修改                       │
└────────────────────────────────────┘
```

**样式规范**：
- 已完成：`color: #4caf50; opacity: 0.7;`
- 进行中：`color: #2196F3; font-weight: 500;` + spinner 动画
- 待处理：`color: #888;`
- 失败：`color: #f44336;`

**图标**：
- 已完成：`✓`
- 进行中：spinner 动画
- 待处理：`○`
- 失败：`✗`

### 决策 5：细粒度进度（可选优化）

**实现方式**：
在"分析页面布局"步骤中，显示更细的子进度：

```typescript
private async analyzeDesignSystemWithProgress(
  onProgress: (message: string) => void
): Promise<PageDesignSystem> {
  const analyzer = new StyleAnalyzer();

  onProgress('正在分析配色...');
  const colorPalette = analyzer.analyzeColorPalette();

  onProgress('正在分析字体...');
  const typography = analyzer.analyzeTypographySystem();

  onProgress('正在分析间距...');
  const spacing = analyzer.analyzeSpacingSystem();

  // ...

  return { colorPalette, typography, spacing, ... };
}

// 调用时：
updateCurrentStep('正在分析配色...');
await Promise.resolve();
const colorPalette = analyzer.analyzeColorPalette();
```

**UI 更新**：
```
⏳ 分析页面布局 → "正在分析配色..." → "正在分析字体..." → "正在分析间距..."
```

### 决策 6：错误处理

**策略**：
- 每个步骤包裹在 try-catch 中
- 失败时：
  1. 更新步骤状态为 `failed`
  2. 显示错误图标（✗）
  3. 显示错误消息
  4. 停止后续步骤
  5. 显示"关闭"按钮

**示例**：
```
✓ 提取元素信息
✗ 提取父元素信息
❌ 元素已被移除，无法继续

[关闭]
```

### 决策 7：防止重复提交

**实现**：
```typescript
private isSubmitting = false;

private async submitAiPrompt(): Promise<void> {
  if (this.isSubmitting) {
    console.warn('[ElementPicker] 正在提交中，忽略重复请求');
    return;
  }

  this.isSubmitting = true;

  try {
    // ... 执行逻辑
  } finally {
    this.isSubmitting = false;
  }
}
```

### 决策 8：保留对话框结构

**选择**：不改变对话框的基本结构，只替换内容

**理由**：
- 最小化变更风险
- 保持现有的定位逻辑
- 用户熟悉的位置

**实现**：
- 复用 `this.aiDialog` 元素
- 使用 `innerHTML` 替换内容
- 保持原有的样式规则

## Risks / Trade-offs

### 风险 1：微任务调度不可靠

**描述**：`await Promise.resolve()` 可能不总是触发 UI 更新

**缓解措施**：
- 使用多个 `await Promise.resolve()` 确保更新
- 如果不够，使用 `await new Promise(r => setTimeout(r, 0))`
- 测试验证更新时机

### 风险 2：同步操作仍然阻塞

**描述**：即使显示 UI，同步操作仍会阻塞主线程

**缓解措施**：
- 设计系统分析（100-150ms）是主要瓶颈
- 考虑分段执行或使用 `requestIdleCallback`
- 或者接受这个延迟（至少用户看到了进度）

### 风险 3：Content Script 的 IIFE 限制

**描述**：不能使用顶级 await，必须在方法内部

**缓解措施**：
- 将 `submitAiPrompt` 改为 async 方法
- 确保调用方使用 `.catch()` 处理错误
- 不修改现有的消息监听器结构

### 风险 4：状态管理复杂度增加

**描述**：多个步骤的状态同步和更新可能出错

**缓解措施**：
- 使用单一数据源（steps 数组）
- 每次更新都重新渲染对应的步骤元素
- 使用 `data-step` 属性精确定位元素

## Implementation Notes

### 关键方法签名

```typescript
private isSubmitting: boolean = false;

private async submitAiPrompt(): Promise<void> {
  // 1. 检查重复提交
  // 2. 生成步骤列表
  // 3. 显示进度 UI
  // 4. 使用微任务调度逐步执行
  // 5. 发送请求到 Background
  // 6. 等待响应（在消息监听器中更新）
}

private generateSteps(needsDeepAnalysis: boolean): ProgressStep[] {
  // 根据 isFuzzyPrompt() 结果返回步骤列表
}

private showProgressSteps(steps: ProgressStep[]): void {
  // 替换 aiDialog.innerHTML，显示步骤列表
}

private updateProgressSteps(steps: ProgressStep[]): void {
  // 更新特定步骤的状态（pending → running → completed）
}

private getStepIcon(status: string): string {
  // 返回步骤图标：○ / ⏳ / ✓ / ✗
}

private updateCurrentStep(message: string): void {
  // 可选：更新当前步骤的文本（用于细粒度进度）
}
```

### 类型定义

```typescript
interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}
```

### 浏览器兼容性

- `async/await`：Chrome 55+, Firefox 52+
- `Promise`：所有现代浏览器
- 微任务调度：所有现代浏览器

项目最低要求已满足。
