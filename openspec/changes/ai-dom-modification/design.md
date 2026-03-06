# Design: AI驱动的DOM修改功能

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         浏览器扩展环境                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Content Script                        │    │
│  │  ┌──────────────┐      ┌──────────────────────────┐   │    │
│  │  │ElementPicker │─────▶│  ModificationHandler     │   │    │
│  │  │  (UI交互)    │      │  (消息发送/接收)          │   │    │
│  │  └──────────────┘      └──────────┬───────────────┘   │    │
│  │                                        │                  │    │
│  │  ┌─────────────────────────────────────▼──────────────┐ │    │
│  │  │          OperationExecutor                         │ │    │
│  │  │  - execute(operations[])                           │ │    │
│  │  │  - validate(operation)                             │ │    │
│  │  │  - apply(element, operation)                       │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↕ runtime.sendMessage                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Background Script                    │    │
│  │  ┌──────────────────────────────────────────────────┐ │    │
│  │  │          MessageRouter                           │ │    │
│  │  │  - onMessage(REQUEST_AI_MODIFICATION)            │ │    │
│  │  │  - getSenderTabId()                              │ │    │
│  │  └──────────────┬───────────────────────────────────┘ │    │
│  │                 │                                      │    │
│  │  ┌──────────────▼───────────────────────────────────┐ │    │
│  │  │              AIClient                            │ │    │
│  │  │  - buildPrompt(userPrompt, elementInfo)          │ │    │
│  │  │  - callAI(config, prompt)                        │ │    │
│  │  │  - parseResponse(response)                       │ │    │
│  │  └──────────────┬───────────────────────────────────┘ │    │
│  └─────────────────┼──────────────────────────────────────┘    │
│                    │ fetch API                                  │
│  ┌─────────────────▼──────────────────────────────────────┐    │
│  │              External AI API                          │    │
│  │  (OpenAI / Claude / Z.ai / Custom)                    │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                      请求流程 (Request)                         │
└─────────────────────────────────────────────────────────────────┘

用户输入prompt
    │
    ▼
┌─────────────────────┐
│  ElementPicker      │
│  - 提取元素信息      │
│  - 构建请求payload  │
└─────────┬───────────┘
          │ browser.runtime.sendMessage({
          │   type: 'REQUEST_AI_MODIFICATION',
          │   payload: { prompt, elementInfo }
          │ })
          ▼
┌─────────────────────┐
│  Background Script  │
│  - 接收消息         │
│  - 获取AI配置       │
│  - 调用AIClient     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  AIClient           │
│  - 构建AI Prompt    │
│  - 调用Provider API │
│  - 解析响应         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Background Script  │
│  - 验证响应格式     │
│  - 发送回Content    │
└─────────┬───────────┘
          │ browser.tabs.sendMessage(tabId, {
          │   type: 'APPLY_OPERATIONS',
          │   payload: { operations }
          │ })
          ▼
┌─────────────────────┐
│  Content Script     │
│  - 接收操作指令     │
│  - 调用Executor     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  OperationExecutor  │
│  - 验证每个操作     │
│  - 应用到DOM        │
│  - 返回结果         │
└─────────┬───────────┘
          │
          ▼
      UI反馈
```

## 核心组件设计

### 1. AIClient (`utils/aiClient.ts`)

#### 职责
- 封装不同AI Provider的API调用
- 构建统一的Prompt
- 解析AI响应为标准格式

#### 接口定义

```typescript
interface AIConfig {
  provider: 'openai' | 'claude' | 'zai' | 'custom';
  apiKey: string;
  modelName: string;
  baseUrl?: string;
  serviceSite?: string;
}

interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  outerHTML: string;
  textContent?: string;
  computedStyles: Record<string, string>;
}

interface ModificationRequest {
  prompt: string;
  elementInfo: ElementInfo;
}

interface AIResponse {
  operations: Operation[];
}

class AIClient {
  async requestModification(
    config: AIConfig,
    request: ModificationRequest
  ): Promise<AIResponse>;

  private buildPrompt(request: ModificationRequest): string;
  private callOpenAI(config: AIConfig, prompt: string): Promise<any>;
  private callClaude(config: AIConfig, prompt: string): Promise<any>;
  private callZAI(config: AIConfig, prompt: string): Promise<any>;
  private parseResponse(response: any, provider: string): AIResponse;
}
```

#### Prompt模板

```typescript
const buildPrompt = (request: ModificationRequest): string => `
你是一个Web元素修改助手。用户希望对页面元素进行修改。

【用户的请求】
${request.prompt}

【目标元素信息】
标签: ${request.elementInfo.tagName}
${request.elementInfo.id ? `ID: ${request.elementInfo.id}` : ''}
${request.elementInfo.className ? `类名: ${request.elementInfo.className}` : ''}
文本内容: ${request.elementInfo.textContent?.slice(0, 100)}
当前样式: ${JSON.stringify(request.elementInfo.computedStyles, null, 2)}

【HTML片段】
\`\`\`html
${request.elementInfo.outerHTML}
\`\`\`

【操作指令格式】
请返回JSON格式的操作数组，支持的operation类型：

样式修改：
- {"operation": "setStyle", "property": "backgroundColor", "value": "red"}
- {"operation": "addClass", "className": "highlight"}
- {"operation": "removeClass", "className": "hidden"}

内容修改：
- {"operation": "setText", "text": "新的文本"}
- {"operation": "setAttribute", "name": "disabled", "value": "true"}
- {"operation": "removeAttribute", "name": "href"}

结构修改：
- {"operation": "removeChild", "selector": ".remove-me"}
- {"operation": "insertChild", "html": "<span>新内容</span>", "position": "append"}

重要限制：
1. 返回的value必须是字符串、数字或布尔值
2. insertChild的html必须简洁，避免复杂结构
3. 只返回必要的操作，不要过度修改
4. 如果请求不合理，返回 {"operation": "explain", "reason": "原因"}

【返回格式】
\`\`\`json
{
  "operations": [
    // 操作数组
  ]
}
\`\`\`
`;
```

### 2. OperationExecutor (`utils/operationExecutor.ts`)

#### 职责
- 验证操作指令的合法性
- 安全地执行DOM操作
- 处理执行错误

#### 接口定义

```typescript
// 操作类型定义
type Operation =
  | SetStyleOperation
  | AddClassOperation
  | RemoveClassOperation
  | SetTextOperation
  | SetAttributeOperation
  | RemoveAttributeOperation
  | InsertChildOperation
  | RemoveChildOperation;

interface SetStyleOperation {
  operation: 'setStyle';
  property: string;
  value: string;
}

interface AddClassOperation {
  operation: 'addClass';
  className: string;
}

// ... 其他操作类型

interface ExecutionContext {
  element: HTMLElement;
  successfulOperations: Operation[];
  failedOperations: Array<{ operation: Operation; error: string }>;
}

class OperationExecutor {
  execute(
    element: HTMLElement,
    operations: unknown[]
  ): Promise<ExecutionResult>;

  private validate(operation: unknown): { valid: boolean; error?: string };
  private applyOperation(
    element: HTMLElement,
    operation: Operation
  ): Promise<{ success: boolean; error?: string }>;
}
```

#### 验证规则

```typescript
class Validator {
  // CSS属性白名单
  private static CSS_WHITELIST = new Set([
    'color', 'backgroundColor', 'fontSize', 'fontWeight',
    'padding', 'margin', 'border', 'borderRadius',
    'width', 'height', 'display', 'visibility',
    // ... 更多
  ]);

  // HTML属性白名单
  private static ATTR_WHITELIST = new Set([
    'disabled', 'readonly', 'checked', 'selected',
    'placeholder', 'title', 'alt', 'src',
    // ... 更多
  ]);

  // 危险模式黑名单
  private static DANGEROUS_PATTERNS = [
    /expression\(/i,
    /javascript:/i,
    /vbscript:/i,
    /data:\s*text\/html/i,
  ];

  static validateStyleProperty(prop: string): boolean {
    return this.CSS_WHITELIST.has(prop);
  }

  static validateAttributeValue(value: string): boolean {
    return !this.DANGEROUS_PATTERNS.some(p => p.test(value));
  }

  static validateHTML(html: string): boolean {
    // 检测script标签
    if (html.toLowerCase().includes('<script')) return false;
    // 检测事件处理器
    if (/on\w+\s*=/.test(html)) return false;
    return true;
  }
}
```

### 3. 消息类型扩展 (`types/messages.ts`)

```typescript
// 新增消息类型

export interface RequestAIModificationMessage {
  type: 'REQUEST_AI_MODIFICATION';
  payload: {
    prompt: string;
    elementInfo: {
      tagName: string;
      id?: string;
      className?: string;
      outerHTML: string;
      textContent?: string;
      computedStyles: Record<string, string>;
    };
  };
}

export interface ApplyOperationsMessage {
  type: 'APPLY_OPERATIONS';
  payload: {
    operations: unknown[];
  };
}

export interface AIModificationResultMessage {
  type: 'AI_MODIFICATION_RESULT';
  payload: {
    success: boolean;
    error?: string;
  };
}

// 扩展联合类型
export type ExtensionMessage =
  | StartPickerMessage
  | StopPickerMessage
  | OpenOptionsMessage
  | RequestAIModificationMessage
  | ApplyOperationsMessage
  | AIModificationResultMessage;
```

### 4. UI状态管理 (`ContentScript/elementPicker.ts`)

#### Loading状态设计

```typescript
// 在ElementPicker类中添加

private showLoading(): void {
  if (!this.aiDialog) return;

  // 保存当前对话框内容
  this.dialogContentBackup = this.aiDialog.innerHTML;

  // 替换为loading状态
  this.aiDialog.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-width: 200px;
    ">
      <div class="picker-spinner" style="
        width: 32px;
        height: 32px;
        border: 3px solid #3e3e3e;
        border-top-color: #2196F3;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <div style="
        margin-top: 12px;
        font-size: 14px;
        color: #d4d4d4;
      ">AI正在思考...</div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  // 禁用所有交互
  this.aiDialog.style.pointerEvents = 'none';
}

private hideLoading(): void {
  // 恢复对话框内容
  if (this.aiDialog && this.dialogContentBackup) {
    this.aiDialog.innerHTML = this.dialogContentBackup;
    this.aiDialog.style.pointerEvents = 'auto';
  }
}

private showError(error: string): void {
  if (!this.aiDialog) return;

  this.aiDialog.innerHTML = `
    <div style="
      padding: 16px;
      min-width: 280px;
    ">
      <div style="
        font-size: 16px;
        color: #f44336;
        margin-bottom: 8px;
        font-weight: 500;
      ">❌ 修改失败</div>
      <div style="
        font-size: 13px;
        color: #d4d4d4;
        margin-bottom: 16px;
        line-height: 1.5;
      ">${this.escapeHtml(error)}</div>
      <button id="closeErrorBtn" style="
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        background: #3e3e3e;
        color: #d4d4d4;
        font-size: 14px;
        cursor: pointer;
      ">关闭</button>
    </div>
  `;

  const closeBtn = this.aiDialog.querySelector('#closeErrorBtn');
  closeBtn?.addEventListener('click', () => {
    this.cancelAiDialog();
  });
}

private showSuccess(): void {
  if (!this.aiDialog) return;

  this.aiDialog.innerHTML = `
    <div style="
      padding: 16px;
      min-width: 280px;
    ">
      <div style="
        font-size: 16px;
        color: #4caf50;
        margin-bottom: 8px;
        font-weight: 500;
      ">✓ 修改成功</div>
      <div style="
        font-size: 13px;
        color: #d4d4d4;
        margin-bottom: 16px;
      ">元素已按照您的要求修改</div>
      <button id="closeSuccessBtn" style="
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        background: #2196F3;
        color: white;
        font-size: 14px;
        cursor: pointer;
      ">继续选择</button>
    </div>
  `;

  const closeBtn = this.aiDialog.querySelector('#closeSuccessBtn');
  closeBtn?.addEventListener('click', () => {
    this.hideAiDialog();
    this.state = 'PICKING';
  });
}
```

## 错误处理策略

### 错误分类

| 错误类型 | 处理方式 | 用户反馈 |
|---------|---------|---------|
| AI配置无效 | 阻止请求，提示配置错误 | "请先配置AI模型" |
| 网络请求失败 | 重试1次，超时10秒 | "网络请求失败，请重试" |
| AI返回格式错误 | 记录日志，提示格式错误 | "AI返回格式错误" |
| 操作验证失败 | 跳过该操作，继续执行 | "部分操作被跳过" |
| DOM操作失败 | 停止执行，回滚已应用的操作 | "应用修改时出错" |
| 元素不存在 | 阻止请求 | "元素已被移除" |

### 重试机制

```typescript
class AIClient {
  private readonly MAX_RETRIES = 1;
  private readonly TIMEOUT = 10000; // 10秒

  async requestModification(
    config: AIConfig,
    request: ModificationRequest
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.callAIWithTimeout(config, request);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.MAX_RETRIES) {
          await this.delay(1000 * (attempt + 1)); // 指数退避
        }
      }
    }

    throw new Error(`AI请求失败: ${lastError?.message}`);
  }

  private async callAIWithTimeout(
    config: AIConfig,
    request: ModificationRequest
  ): Promise<AIResponse> {
    return Promise.race([
      this.callAI(config, request),
      this.timeout(this.TIMEOUT)
    ]);
  }
}
```

## 安全考虑

### 1. XSS防护

```typescript
// 所有HTML插入前必须净化
function sanitizeHTML(html: string): string {
  // 移除script标签
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // 移除事件处理器
  html = html.replace(/\s+on\w+\s*=/gi, '');
  // 移除javascript:协议
  html = html.replace(/javascript:/gi, '');
  return html;
}
```

### 2. 操作白名单

只允许预定义的安全操作，不执行任意JavaScript。

### 3. 沙箱执行

所有DOM操作在当前页面的content script中执行，不使用eval或Function。

## 性能优化

### 1. 批量操作

```typescript
// 使用requestAnimationFrame批量应用样式变更
function batchApplyStyleChanges(
  element: HTMLElement,
  changes: Record<string, string>
): void {
  requestAnimationFrame(() => {
    Object.assign(element.style, changes);
  });
}
```

### 2. 减少重排

```typescript
// 集中读取，再集中写入
function optimizeDOMOperations(element: HTMLElement): void {
  // 读取阶段
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  // 写入阶段
  element.style.width = `${rect.width + 10}px`;
  element.classList.add('modified');
}
```

## 测试策略

### 单元测试
- AIClient的Prompt构建
- OperationExecutor的验证逻辑
- 各个操作的apply函数

### 集成测试
- 完整的消息流程
- 不同AI Provider的调用
- 错误场景处理

### 手动测试场景
1. 修改元素颜色
2. 修改元素文本
3. 添加CSS class
4. 插入子元素
5. 删除子元素
6. 无效prompt处理
7. 网络错误处理
8. 格式错误处理

## 兼容性

### Chrome
- Service Worker环境
- chrome.runtime.sendMessage
- chrome.tabs.sendMessage

### Firefox
- Background Page环境
- browser.runtime.sendMessage
- browser.tabs.sendMessage

### 统一
- 使用webextension-polyfill
- TypeScript类型定义
