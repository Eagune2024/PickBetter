# Proposal: AI驱动的DOM修改功能

## 概述

为PickBetter浏览器扩展添加AI驱动的DOM修改功能。用户通过元素选择器选中页面元素后，可以用自然语言描述想要的修改（如"把按钮改成红色"、"删除这个提示文字"），系统将调用AI模型生成结构化的修改指令并自动应用到页面。

## 背景

当前PickBetter已经实现了：
- ✅ 元素选择器（hover高亮 + click选中）
- ✅ AI对话框（用户输入自然语言prompt）
- ✅ AI模型配置管理（支持OpenAI/Claude/Z.ai/自定义）
- ✅ 配置检测（未配置时引导用户去设置页面）

**缺失的核心功能**：
- ❌ AI模型调用
- ❌ DOM修改指令生成
- ❌ 修改操作执行

## 目标

### 主要目标
1. 实现用户提交prompt后的完整AI处理流程
2. 支持样式、内容、结构三类DOM修改
3. 提供安全的操作执行机制
4. 友好的用户反馈（loading、成功、错误提示）

### 非目标
- ❌ 不支持多元素批量操作
- ❌ 不提供撤销/重做功能
- ❌ 不保存修改历史
- ❌ 不提供修改导出功能

## 功能范围

### 1. 支持的修改类型

**样式修改**：
- 修改inline style（color, background, padding等）
- 添加/移除CSS class

**内容修改**：
- 修改文本内容
- 修改HTML属性（disabled, placeholder等）
- 修改innerHTML（高级，需净化）

**结构修改**：
- 插入子元素
- 删除子元素
- 用新元素包裹当前元素

### 2. AI模型支持

- ✅ OpenAI (GPT-4, GPT-3.5等)
- ✅ Claude (Claude-3系列)
- ✅ Z.ai (GLM系列)
- ✅ 自定义API（兼容OpenAI格式）

### 3. 安全机制

- 操作指令类型验证
- CSS属性白名单
- HTML属性白名单
- 危险模式检测（expression, javascript:等）
- Script标签拦截

## 用户流程

```
1. 用户点击扩展图标
   ↓
2. 激活元素选择器
   ↓
3. Hover高亮元素 + Click选中
   ↓
4. 弹出对话框"如何调整此元素?"
   ↓
5. 用户输入："把按钮改成红色"
   ↓
6. [Loading] AI正在思考...
   ↓
7a. 成功：修改应用到元素
7b. 失败：显示错误提示
   ↓
8. 返回选择模式，可继续选择其他元素
```

## 技术方案概述

### 架构模式

采用**消息驱动的三层架构**：

```
┌─────────────────┐
│ Content Script  │ ← 用户交互、DOM操作
└────────┬────────┘
         │ messages
┌────────▼────────┐
│  Background     │ ← AI调用、消息路由
│    Script       │
└─────────────────┘
         │ HTTP API
┌────────▼────────┐
│   AI Provider   │ ← OpenAI/Claude/Z.ai
└─────────────────┘
```

### 关键组件

1. **AIClient** (`utils/aiClient.ts`)
   - 封装不同AI provider的API调用
   - 统一的请求/响应格式
   - 错误处理和重试机制

2. **OperationExecutor** (`utils/operationExecutor.ts`)
   - 执行AI生成的操作指令
   - 安全验证（白名单、黑名单）
   - 错误恢复

3. **消息类型扩展** (`types/messages.ts`)
   - `REQUEST_AI_MODIFICATION`：Content → Background
   - `APPLY_OPERATIONS`：Background → Content
   - `AI_MODIFICATION_RESULT`：结果反馈

4. **UI状态管理**
   - Modal loading遮罩
   - 成功/错误提示
   - 对话框状态转换

## 实现约束

1. **跨浏览器兼容**
   - Chrome (Service Worker)
   - Firefox (Background Script)
   - 使用webextension-polyfill

2. **Content Script限制**
   - 必须打包为IIFE（不能使用ES Module）
   - 有限的DOM访问权限
   - 需要通过Background进行网络请求

3. **安全限制**
   - 不能直接执行AI生成的JavaScript代码
   - 必须验证所有操作指令
   - 防止XSS注入

## 验收标准

### 功能验收
- [ ] 用户输入prompt后能看到loading状态
- [ ] AI返回格式正确时，修改成功应用到元素
- [ ] AI返回格式错误时，显示友好错误提示
- [ ] 支持至少3种常见修改场景（改样式、改文本、加元素）

### 质量验收
- [ ] 所有操作有类型定义（TypeScript）
- [ ] 通过ESLint检查无错误
- [ ] 在Chrome和Firefox上测试通过
- [ ] 危险操作被正确拦截

### 性能验收
- [ ] AI请求在10秒内完成或超时
- [ ] Loading状态响应及时（<100ms）
- [ ] DOM操作不阻塞主线程

## 风险与依赖

### 主要风险
1. **AI响应格式不稳定**：不同模型可能返回不同格式
   - 缓解：使用严格的schema定义和验证

2. **安全风险**：AI可能生成危险操作
   - 缓解：多层验证（格式、白名单、模式检测）

3. **网络依赖**：需要稳定的AI API访问
   - 缓解：合理的超时和错误处理

### 外部依赖
- webextension-polyfill（已有）
- AI provider API（用户配置）
- TypeScript 5.9（已有）

## 时间估算

- 总计：约 12-16 小时
- 核心功能：8-10 小时
- 测试和调试：4-6 小时

## 后续迭代

这个实现作为基础框架，后续可以通过skill扩展：
- 更细粒度的操作验证规则
- 复杂场景的智能处理
- 撤销/重做功能
- 修改历史记录
- 批量操作支持
