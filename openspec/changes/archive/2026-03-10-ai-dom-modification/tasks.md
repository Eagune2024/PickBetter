# Tasks: AI驱动的DOM修改功能

## 实现任务列表

### Phase 1: 基础设施 (Foundation)

#### Task 1.1: 定义操作类型
**描述**: 在`types/operations.ts`中定义所有支持的操作类型

**实现细节**:
- 创建`source/types/operations.ts`
- 定义`Operation`联合类型
- 定义每个操作的接口（SetStyleOperation, AddClassOperation等）
- 导出类型供其他模块使用

**验收标准**:
- [x] 文件已创建在正确路径
- [x] 包含至少8种操作类型定义
- [x] 所有类型有完整的类型注解
- [x] 通过TypeScript编译检查

**依赖**: 无
**估算**: 30分钟

---

#### Task 1.2: 扩展消息类型
**描述**: 在`types/messages.ts`中添加新的消息类型

**实现细节**:
- 添加`RequestAIModificationMessage`接口
- 添加`ApplyOperationsMessage`接口
- 添加`AIModificationResultMessage`接口
- 扩展`ExtensionMessage`联合类型

**验收标准**:
- [x] 新增3个消息接口
- [x] ExtensionMessage类型已更新
- [x] 所有接口有完整的属性定义
- [x] 无类型冲突

**依赖**: Task 1.1
**估算**: 20分钟

---

### Phase 2: AI客户端 (AIClient)

#### Task 2.1: 创建AIClient基础结构
**描述**: 创建`utils/aiClient.ts`文件，实现类的基本结构

**实现细节**:
- 创建`source/utils/aiClient.ts`
- 定义`AIClient`类
- 实现`requestModification`方法框架
- 定义私有方法签名（buildPrompt, callAI, parseResponse）

**验收标准**:
- [ ] 文件已创建
- [ ] 类和方法的TypeScript类型正确
- [ ] 代码通过ESLint检查

**依赖**: Task 1.1, Task 1.2
**估算**: 40分钟

---

#### Task 2.2: 实现Prompt构建
**描述**: 实现buildPrompt方法，构建发送给AI的结构化prompt

**实现细节**:
- 实现buildPrompt私有方法
- 使用design.md中定义的prompt模板
- 格式化elementInfo
- 添加操作类型说明
- 添加返回格式示例

**验收标准**:
- [ ] Prompt包含用户请求
- [ ] Prompt包含元素信息
- [ ] Prompt包含操作类型说明
- [ ] Prompt包含返回格式要求
- [ ] 测试生成的prompt格式正确

**依赖**: Task 2.1
**估算**: 1小时

---

#### Task 2.3: 实现OpenAI调用
**描述**: 实现callOpenAI方法，调用OpenAI API

**实现细节**:
- 实现callOpenAI私有方法
- 使用fetch API调用OpenAI endpoint
- 设置正确的请求头（Authorization, Content-Type）
- 构建请求body（model, messages, temperature等）
- 处理响应和错误

**验收标准**:
- [ ] 成功调用OpenAI API
- [ ] 正确处理API错误响应
- [ ] 返回格式化的响应数据
- [ ] 超时处理（10秒）

**依赖**: Task 2.2
**估算**: 1.5小时

---

#### Task 2.4: 实现Claude调用
**描述**: 实现callClaude方法，调用Anthropic Claude API

**实现细节**:
- 实现callClaude私有方法
- 使用fetch API调用Claude endpoint
- 设置anthropic-version header
- 构建Claude格式的请求body
- 处理响应和错误

**验收标准**:
- [ ] 成功调用Claude API
- [ ] 正确处理API错误响应
- [ ] 返回格式化的响应数据
- [ ] 超时处理（10秒）

**依赖**: Task 2.2
**估算**: 1.5小时

---

#### Task 2.5: 实现Z.ai调用
**描述**: 实现callZAI方法，调用Z.ai API

**实现细节**:
- 实现callZAI私有方法
- 使用fetch API调用Z.ai endpoint
- 根据serviceSite选择正确的endpoint
- 构建请求body（兼容OpenAI格式）
- 处理响应和错误

**验收标准**:
- [ ] 成功调用Z.ai API
- [ ] 正确处理API错误响应
- [ ] 返回格式化的响应数据
- [ ] 超时处理（10秒）

**依赖**: Task 2.2
**估算**: 1小时

---

#### Task 2.6: 实现响应解析
**描述**: 实现parseResponse方法，将不同provider的响应统一解析为标准格式

**实现细节**:
- 实现parseResponse私有方法
- 处理OpenAI格式响应
- 处理Claude格式响应
- 处理Z.ai格式响应
- 提取operations数组
- 错误处理：如果格式无效，抛出清晰的错误信息

**验收标准**:
- [ ] 正确解析OpenAI响应
- [ ] 正确解析Claude响应
- [ ] 正确解析Z.ai响应
- [ ] 格式错误时抛出异常
- [ ] 返回标准的AIResponse类型

**依赖**: Task 2.3, Task 2.4, Task 2.5
**估算**: 1小时

---

#### Task 2.7: 实现重试机制
**描述**: 为AIClient添加重试逻辑和超时处理

**实现细节**:
- 实现retry包装器
- 最多重试1次
- 指数退避（1秒延迟）
- 添加10秒超时限制
- 记录重试日志

**验收标准**:
- [ ] 网络错误时自动重试
- [ ] 超时后抛出错误
- [ ] 重试不超过1次
- [ ] 控制台输出重试日志

**依赖**: Task 2.6
**估算**: 40分钟

---

### Phase 3: 操作执行器 (OperationExecutor)

#### Task 3.1: 创建OperationExecutor基础结构
**描述**: 创建`utils/operationExecutor.ts`文件，实现类的基本结构

**实现细节**:
- 创建`source/utils/operationExecutor.ts`
- 定义`OperationExecutor`类
- 实现`execute`方法框架
- 定义`validate`和`applyOperation`方法签名

**验收标准**:
- [ ] 文件已创建
- [ ] 类结构正确
- [ ] TypeScript类型完整
- [ ] 通过ESLint检查

**依赖**: Task 1.1
**估算**: 30分钟

---

#### Task 3.2: 实现样式操作
**描述**: 实现setStyle, addClass, removeClass操作的验证和执行

**实现细节**:
- 实现validateSetStyle方法（CSS属性白名单验证）
- 实现applySetStyle方法（应用inline style）
- 实现validateAddClass方法（类名格式验证）
- 实现applyAddClass方法（添加class）
- 实现applyRemoveClass方法（移除class）

**验收标准**:
- [ ] CSS属性在白名单内才能通过验证
- [ ] setStyle正确应用到element.style
- [ ] addClass正确添加class
- [ ] removeClass正确移除class
- [ ] 验证失败返回错误信息

**依赖**: Task 3.1
**估算**: 2小时

---

#### Task 3.3: 实现内容操作
**描述**: 实现setText, setAttribute, removeAttribute操作

**实现细节**:
- 实现applySetText方法
- 实现validateSetAttribute方法（属性名白名单）
- 实现applySetAttribute方法
- 实现validateRemoveAttribute方法
- 实现applyRemoveAttribute方法

**验收标准**:
- [ ] setText正确修改textContent
- [ ] 属性名在白名单内才能通过验证
- [ ] setAttribute正确设置属性
- [ ] removeAttribute正确移除属性
- [ ] 验证失败返回错误信息

**依赖**: Task 3.1
**估算**: 1.5小时

---

#### Task 3.4: 实现结构操作
**描述**: 实现insertChild, removeChild操作

**实现细节**:
- 实现validateInsertChild方法（HTML净化）
- 实现applyInsertChild方法（支持append, prepend, before, after）
- 实现validateRemoveChild方法
- 实现applyRemoveChild方法

**验收标准**:
- [ ] HTML中的script标签被移除
- [ ] HTML中的事件处理器被移除
- [ ] insertChild正确插入元素
- [ ] removeChild正确移除元素
- [ ] 验证失败返回错误信息

**依赖**: Task 3.1
**估算**: 2小时

---

#### Task 3.5: 实现白名单和验证器
**描述**: 创建Validator工具类，实现所有验证逻辑

**实现细节**:
- 定义CSS属性白名单（至少30个常用属性）
- 定义HTML属性白名单（至少20个安全属性）
- 定义危险模式黑名单（expression, javascript:等）
- 实现validateStyleProperty方法
- 实现validateAttributeValue方法
- 实现validateHTML方法

**验收标准**:
- [ ] 白名单包含足够的属性
- [ ] 黑名单能检测危险模式
- [ ] 所有验证方法返回boolean
- [ ] 单元测试覆盖主要验证逻辑

**依赖**: Task 3.2, Task 3.3, Task 3.4
**估算**: 1.5小时

---

#### Task 3.6: 实现批量执行逻辑
**描述**: 完善execute方法，实现批量操作执行和错误处理

**实现细节**:
- 实现execute主方法
- 遍历operations数组
- 对每个操作：验证 → 执行 → 记录结果
- 收集成功的操作和失败的操作
- 如果有操作失败，返回详细的错误信息
- 实现部分失败的场景处理

**验收标准**:
- [ ] 所有操作按顺序执行
- [ ] 验证失败的操作被跳过
- [ ] 执行失败的操作被记录
- [ ] 返回ExecutionResult包含成功和失败的操作
- [ ] 即使部分操作失败，也继续执行剩余操作

**依赖**: Task 3.2, Task 3.3, Task 3.4, Task 3.5
**估算**: 1.5小时

---

### Phase 4: Background Script集成

#### Task 4.1: 添加消息处理器
**描述**: 在Background Script中添加REQUEST_AI_MODIFICATION消息的处理器

**实现细节**:
- 打开`source/Background/index.ts`
- 在runtime.onMessage中添加REQUEST_AI_MODIFICATION分支
- 实现handleAIModification函数
- 从sender.tab.id获取tab ID
- 调用AIClient.requestModification
- 将结果发送回Content Script

**验收标准**:
- [ ] 能接收REQUEST_AI_MODIFICATION消息
- [ ] 正确获取sender.tab.id
- [ ] 成功调用AIClient
- [ ] 结果通过tabs.sendMessage发回Content Script

**依赖**: Task 2.7
**估算**: 1小时

---

#### Task 4.2: 实现错误处理和重试
**描述**: 在Background Script中添加完善的错误处理逻辑

**实现细节**:
- 捕获AIClient调用的所有异常
- 处理网络错误、超时、API错误
- 构建友好的错误消息
- 发送错误结果回Content Script
- 添加console日志记录

**验收标准**:
- [ ] 网络错误时返回友好的错误消息
- [ ] API错误时返回清晰的错误描述
- [ ] 所有错误都被捕获，不会导致background崩溃
- [ ] 控制台输出有用的调试信息

**依赖**: Task 4.1
**估算**: 1小时

---

### Phase 5: Content Script集成

#### Task 5.1: 提取元素信息
**描述**: 在ElementPicker中实现extractElementInfo方法

**实现细节**:
- 在elementPicker.ts中添加extractElementInfo方法
- 提取tagName, id, className
- 提取outerHTML（截断到1000字符）
- 提取textContent（截断到100字符）
- 提取computedStyles（只提取常用属性）

**验收标准**:
- [ ] 返回完整的ElementInfo对象
- [ ] outerHTML被正确截断
- [ ] textContent被正确截断
- [ ] computedStyles包含至少10个常用CSS属性

**依赖**: Task 1.2
**估算**: 1小时

---

#### Task 5.2: 实现submitAiPrompt方法
**描述**: 完善submitAiPrompt方法，实现AI请求发送

**实现细节**:
- 修改elementPicker.ts的submitAiPrompt方法
- 调用extractElementInfo获取元素信息
- 构建RequestAIModificationMessage
- 发送消息到Background
- 调用showLoading显示loading状态
- 移除原有的TODO代码

**验收标准**:
- [ ] 提取的元素信息完整
- [ ] 消息格式正确
- [ ] 成功发送到Background
- [ ] 显示loading状态
- [ ] 用户无法操作（对话框禁用）

**依赖**: Task 5.1, Task 1.2
**估算**: 1.5小时

---

#### Task 5.3: 实现loading UI
**描述**: 实现showLoading、hideLoading方法

**实现细节**:
- 实现showLoading方法
  - 保存当前对话框内容
  - 显示spinner和"AI正在思考..."文本
  - 禁用对话框交互（pointer-events: none）
- 实现hideLoading方法
  - 恢复对话框内容
  - 启用对话框交互

**验收标准**:
- [ ] Loading状态正确显示
- [ ] Spinner动画流畅
- [ ] 用户无法在loading时操作对话框
- [ ] Hide后正确恢复原内容

**依赖**: 无
**估算**: 1小时

---

#### Task 5.4: 添加消息监听器
**描述**: 在Content Script中添加APPLY_OPERATIONS消息的监听器

**实现细节**:
- 在elementPicker.ts中添加runtime.onMessage监听器
- 过滤APPLY_OPERATIONS消息类型
- 调用OperationExecutor.execute
- 处理执行结果
- 调用showSuccess或showError

**验收标准**:
- [ ] 能接收APPLY_OPERATIONS消息
- [ ] 正确调用OperationExecutor
- [ ] 成功时调用showSuccess
- [ ] 失败时调用showError并传递错误信息

**依赖**: Task 3.6
**估算**: 1小时

---

#### Task 5.5: 实现成功/失败UI
**描述**: 实现showSuccess、showError方法

**实现细节**:
- 实现showSuccess方法
  - 显示✓图标和"修改成功"文本
  - 显示"继续选择"按钮
  - 按钮点击后关闭对话框，返回PICKING状态
- 实现showError方法
  - 显示❌图标和错误消息
  - 显示"关闭"按钮
  - 按钮点击后关闭对话框

**验收标准**:
- [ ] 成功状态UI友好清晰
- [ ] 错误状态UI友好清晰
- [ ] 错误消息被正确转义，防止XSS
- [ ] 按钮点击后正确转换状态

**依赖**: Task 5.3
**估算**: 1小时

---

### Phase 6: 测试和调试

#### Task 6.1: 单元测试 - AIClient
**描述**: 为AIClient编写单元测试

**实现细节**:
- 测试buildPrompt方法
- 测试parseResponse方法
- Mock fetch API测试各个provider调用
- 测试重试机制
- 测试超时处理

**验收标准**:
- [ ] 测试覆盖至少80%的代码
- [ ] 所有测试通过
- [ ] Mock行为正确

**依赖**: Task 2.7
**估算**: 2小时

---

#### Task 6.2: 单元测试 - OperationExecutor
**描述**: 为OperationExecutor编写单元测试

**实现细节**:
- 测试各个操作的验证逻辑
- 测试各个操作的执行逻辑
- 测试批量执行
- 测试错误处理
- 使用JSDOM创建虚拟DOM环境

**验收标准**:
- [ ] 测试覆盖至少80%的代码
- [ ] 所有测试通过
- [ ] DOM操作测试正确

**依赖**: Task 3.6
**估算**: 2.5小时

---

#### Task 6.3: 集成测试 - 完整流程
**描述**: 测试完整的AI修改流程

**实现细节**:
- 在Chrome中加载扩展
- 测试修改样式场景（如"把按钮改成红色"）
- 测试修改内容场景（如"把文字改成Hello"）
- 测试添加元素场景（如"添加一个图标"）
- 测试错误场景（如无效prompt、网络错误）
- 在Firefox中重复上述测试

**验收标准**:
- [ ] 所有场景在Chrome上工作正常
- [ ] 所有场景在Firefox上工作正常
- [ ] 错误场景显示正确的错误消息
- [ ] Loading状态正确显示和隐藏

**依赖**: 所有Phase 1-5任务
**估算**: 3小时

---

#### Task 6.4: 安全测试
**描述**: 测试安全机制是否有效

**实现细节**:
- 测试XSS防护（prompt中包含script标签）
- 测试危险CSS属性（如expression）
- 测试危险HTML属性（如onclick）
- 测试危险HTML（javascript:协议）
- 验证所有危险操作被正确拦截

**验收标准**:
- [ ] Script标签被过滤
- [ ] 危险CSS属性被拒绝
- [ ] 事件处理器属性被拒绝
- [ ] JavaScript协议被过滤
- [ ] 控制台记录拦截日志

**依赖**: Task 3.6, Task 6.3
**估算**: 1.5小时

---

#### Task 6.5: 性能测试
**描述**: 测试性能是否满足要求

**实现细节**:
- 测试AI请求响应时间（应在10秒内完成）
- 测试loading状态显示速度（应在100ms内）
- 测试大量操作的执行时间（如20个操作）
- 测试DOM操作是否阻塞主线程
- 使用Performance API记录关键指标

**验收标准**:
- [ ] AI请求不超过10秒
- [ ] Loading状态显示不超过100ms
- [ ] 20个操作在500ms内完成
- [ ] 主线程不卡顿

**依赖**: Task 6.3
**估算**: 1小时

---

### Phase 7: 文档和发布准备

#### Task 7.1: 更新用户文档
**描述**: 在Options页面添加使用说明

**实现细节**:
- 在Options.tsx中添加"使用说明"部分
- 说明如何使用AI修改功能
- 提供示例prompt
- 说明支持的修改类型

**验收标准**:
- [ ] 文档清晰易懂
- [ ] 包含至少3个使用示例
- [ ] 格式美观

**依赖**: Task 6.3
**估算**: 1小时

---

#### Task 7.2: 代码审查和清理
**描述**: 审查所有代码，进行清理和优化

**实现细节**:
- 运行npm run lint检查代码风格
- 运行npm run lint:fix自动修复
- 移除console.log调试代码（保留必要的错误日志）
- 添加必要的注释
- 检查类型定义是否完整

**验收标准**:
- [ ] ESLint无错误
- [ ] 代码风格一致
- [ ] 类型定义完整
- [ ] 无TODO注释（已实现的功能）

**依赖**: 所有Phase 1-6任务
**估算**: 1小时

---

#### Task 7.3: 构建和打包测试
**描述**: 在Chrome和Firefox上测试生产构建

**实现细节**:
- 运行npm run build:chrome
- 在Chrome中加载extension/chrome
- 运行完整功能测试
- 运行npm run build:firefox
- 在Firefox中加载extension/firefox
- 运行完整功能测试

**验收标准**:
- [ ] Chrome构建成功
- [ ] Firefox构建成功
- [ ] 两个浏览器的扩展都能正常工作
- [ ] 无控制台错误

**依赖**: Task 7.2
**估算**: 1小时

---

## 任务依赖图

```
Phase 1: 基础设施
  ├─ Task 1.1 (定义操作类型)
  └─ Task 1.2 (扩展消息类型) ──┐
                              │
Phase 2: AI客户端             │
  ├─ Task 2.1 (基础结构) ─────┤
  ├─ Task 2.2 (Prompt构建)    │
  ├─ Task 2.3 (OpenAI)        │
  ├─ Task 2.4 (Claude)        │
  ├─ Task 2.5 (Z.ai)          │
  ├─ Task 2.6 (响应解析)      │
  └─ Task 2.7 (重试机制) ─────┤
                              │
Phase 3: 操作执行器           │
  ├─ Task 3.1 (基础结构) ─────┤
  ├─ Task 3.2 (样式操作)      │
  ├─ Task 3.3 (内容操作)      │
  ├─ Task 3.4 (结构操作)      │
  ├─ Task 3.5 (验证器)        │
  └─ Task 3.6 (批量执行) ─────┤
                              │
Phase 4: Background集成       │
  ├─ Task 4.1 (消息处理器) ───┤
  └─ Task 4.2 (错误处理) ─────┤
                              │
Phase 5: Content Script集成   │
  ├─ Task 5.1 (提取元素信息)  │
  ├─ Task 5.2 (提交prompt) ───┤
  ├─ Task 5.3 (Loading UI) ───┤
  ├─ Task 5.4 (消息监听器) ───┤
  ├─ Task 5.5 (成功/失败UI) ──┤
                              │
Phase 6: 测试和调试           │
  ├─ Task 6.1 (AIClient测试)  │
  ├─ Task 6.2 (Executor测试)  │
  ├─ Task 6.3 (集成测试) ─────┤
  ├─ Task 6.4 (安全测试)      │
  └─ Task 6.5 (性能测试)      │
                              │
Phase 7: 文档和发布           │
  ├─ Task 7.1 (用户文档) ─────┤
  ├─ Task 7.2 (代码审查) ─────┤
  └─ Task 7.3 (构建测试) ─────┘
```

## 总时间估算

- Phase 1: 50分钟
- Phase 2: 7小时40分钟
- Phase 3: 9小时30分钟
- Phase 4: 2小时
- Phase 5: 5小时30分钟
- Phase 6: 10小时
- Phase 7: 3小时

**总计**: 约 38小时（5个工作日）

## 优先级

如果时间有限，建议按以下优先级实现：

**P0 (必须实现)**:
- Phase 1: 基础设施
- Phase 2.1-2.6: AIClient核心功能（不含重试）
- Phase 3.1-3.6: OperationExecutor核心功能
- Phase 4: Background集成
- Phase 5: Content Script集成

**P1 (重要)**:
- Phase 6.3: 集成测试
- Phase 6.4: 安全测试
- Phase 7.2: 代码审查

**P2 (可选)**:
- Phase 2.7: 重试机制
- Phase 6.1-6.2: 单元测试
- Phase 6.5: 性能测试
- Phase 7.1: 用户文档
- Phase 7.3: 构建测试

## 风险项

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| AI API格式变化 | 高 | 使用标准化API，添加适配层 |
| Content Script内存泄漏 | 中 | 正确清理DOM引用和事件监听器 |
| XSS攻击 | 高 | 多层验证，严格的白名单 |
| 跨浏览器兼容性 | 中 | 使用webextension-polyfill，充分测试 |
| 性能问题 | 中 | 使用requestAnimationFrame优化DOM操作 |
