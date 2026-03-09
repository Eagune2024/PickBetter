# Tasks: 渐进式 AI 反馈体验优化

实现任务列表，按顺序完成所有任务即可实现完整的渐进式进度反馈功能。

## 1. 基础结构改造

- [ ] 1.1 添加类型定义
  - 在 `source/ContentScript/elementPicker.ts` 中添加 `ProgressStep` 接口
  - 定义状态枚举类型：'pending' | 'running' | 'completed' | 'failed'
  - 添加 `isSubmitting` 私有属性
  - 验收标准：TypeScript 编译通过

- [ ] 1.2 改造 submitAiPrompt 方法签名
  - 将 `submitAiPrompt()` 从同步方法改为异步方法
  - 修改方法签名为 `async submitAiPrompt(): Promise<void>`
  - 添加 `if (this.isSubmitting) return;` 检查
  - 在 try-finally 块中设置和重置 `isSubmitting` 标志
  - 验收标准：方法变为 async，防止重复提交

## 2. 步骤生成逻辑

- [ ] 2.1 实现动态步骤生成方法
  - 创建 `generateSteps(needsDeepAnalysis: boolean)` 私有方法
  - 明确指令返回 3 个步骤数组
  - 模糊指令返回 6 个步骤数组
  - 验收标准：根据参数返回正确的步骤数组

- [ ] 2.2 集成步骤生成到 submitAiPrompt
  - 在 `submitAiPrompt` 开始时调用 `isFuzzyPrompt()`
  - 根据返回值调用 `generateSteps()` 生成步骤列表
  - 验收标准：步骤列表根据指令类型动态生成

## 3. UI 组件实现

- [ ] 3.1 实现步骤图标获取方法
  - 创建 `getStepIcon(status: string)` 私有方法
  - 根据状态返回：○ / ⏳ / ✓ / ✗
  - 验收标准：返回正确的图标字符

- [ ] 3.2 实现 showProgressSteps 方法
  - 创建 `showProgressSteps(steps: ProgressStep[])` 私有方法
  - 替换 `this.aiDialog.innerHTML` 显示步骤列表
  - 使用内联样式确保在所有页面正常显示
  - 添加 spinner 动画样式（`@keyframes spin`）
  - 验收标准：立即显示步骤列表，样式正确

- [ ] 3.3 实现 updateProgressSteps 方法
  - 创建 `updateProgressSteps(steps: ProgressStep[])` 私有方法
  - 使用 `querySelector('[data-step="..."]')` 精确定位步骤元素
  - 更新图标文本（通过 `getStepIcon()`）
  - 更新状态类（pending/running/completed/failed）
  - 验收标准：步骤状态正确更新

- [ ] 3.4 实现 showProgressSteps 中的样式定义
  - 定义 `.progress-step` 基础样式
  - 定义 `.progress-step.completed` 样式（绿色、半透明）
  - 定义 `.progress-step.running` 样式（蓝色、加粗）
  - 定义 `.progress-step.pending` 样式（灰色）
  - 定义 `.progress-step.failed` 样式（红色）
  - 定义 `.step-icon` 样式（宽度、右边距）
  - 定义 spinner 动画
  - 验收标准：所有状态样式正确显示

## 4. 核心执行流程

- [ ] 4.1 改造 submitAiPrompt - 步骤 1
  - 在方法开始立即调用 `showProgressSteps(steps)`
  - 在显示步骤后插入 `await Promise.resolve()`
  - 验收标准：用户立即看到步骤列表

- [ ] 4.2 改造 submitAiPrompt - 步骤 2
  - 更新第一步状态为 'running'
  - 调用 `updateProgressSteps(steps)`
  - 插入 `await Promise.resolve()`
  - 验收标准：第一步显示为进行中

- [ ] 4.3 改造 submitAiPrompt - 步骤 3
  - 执行 `extractElementInfo()`
  - 更新第一步状态为 'completed'
  - 调用 `updateProgressSteps(steps)`
  - 插入 `await Promise.resolve()`
  - 验收标准：第一步显示为完成

- [ ] 4.4 改造 submitAiPrompt - 模糊指令分支
  - 如果 `needsDeepAnalysis` 为 true
  - 依次处理：父元素、兄弟元素、设计系统分析
  - 每个步骤：running → 执行 → completed → updateProgressSteps → await Promise.resolve()
  - 验收标准：模糊指令的所有步骤依次完成

- [ ] 4.5 改造 submitAiPrompt - 发送请求
  - 更新"AI 正在思考..."步骤为 'running'
  - 调用 `updateProgressSteps(steps)`
  - 发送 `browser.runtime.sendMessage()`
  - 不等待响应（由消息监听器处理后续）
  - 验收标准：请求发送，步骤状态更新

## 5. 消息监听器集成

- [ ] 5.1 更新消息监听器处理响应
  - 在 `browser.runtime.onMessage.addListener` 中
  - 收到 `APPLY_OPERATIONS` 消息时
  - 更新"AI 正在思考..."步骤为 'completed'
  - 更新"应用修改"步骤为 'running'
  - 调用 `updateProgressSteps(steps)`
  - 验收标准：响应到达时步骤状态更新

- [ ] 5.2 处理操作执行结果
  - 在操作执行完成后
  - 更新"应用修改"步骤为 'completed'
  - 调用 `showSuccess()` 或 `showError()`
  - 验收标准：显示最终结果

- [ ] 5.3 处理错误情况
  - 如果消息包含 `error` 字段
  - 找到当前 running 的步骤
  - 更新该步骤为 'failed'
  - 调用 `updateProgressSteps(steps)`
  - 显示错误对话框
  - 验收标准：错误时显示失败步骤和错误信息

## 6. 错误处理

- [ ] 6.1 添加 try-catch 包裹关键操作
  - 在 `submitAiPrompt` 中包裹所有关键操作
  - 捕获错误时更新步骤状态为 'failed'
  - 显示错误消息并停止后续步骤
  - 验收标准：任何错误都有清晰的反馈

- [ ] 6.2 实现 showErrorInSteps 方法
  - 创建 `showErrorInSteps(stepId: string, message: string)` 方法
  - 在进度对话框中显示错误信息
  - 提供"关闭"按钮
  - 点击关闭按钮调用 `cancelAiDialog()`
  - 验收标准：错误清晰显示，用户可以关闭

## 7. 可选优化

- [ ] 7.1 实现细粒度进度提示
  - 创建 `updateCurrentStep(message: string)` 方法
  - 在"分析页面布局"步骤中显示子进度
  - 调用 `updateCurrentStep('正在分析配色...')` 等
  - 验收标准：用户看到更详细的进度信息

- [ ] 7.2 优化设计系统分析的反馈
  - 在 `analyzePageDesignSystem` 执行期间
  - 每完成一个子分析（配色、字体等）更新一次当前步骤文本
  - 使用 `updateCurrentStep` 显示进度
  - 验收标准：长操作有中间进度反馈

## 8. 测试和验证

- [ ] 8.1 手动测试 - 明确指令
  - 在测试页面输入明确指令（如"把背景改成红色"）
  - 验证显示 3 个步骤
  - 验证步骤依次完成
  - 验证最终显示成功状态
  - 验收标准：明确指令流程完整无误

- [ ] 8.2 手动测试 - 模糊指令
  - 在测试页面输入模糊指令（如"让这个更现代"）
  - 验证显示 6 个步骤
  - 验证所有步骤依次完成
  - 验证"分析页面布局"步骤有足够时间完成
  - 验收标准：模糊指令流程完整无误

- [ ] 8.3 性能测试
  - 测试 Enter 到显示 UI 的时间（应 <10ms）
  - 测试微任务调度开销（应 <5ms）
  - 测试总体时间增加（应 <10ms）
  - 验收标准：性能指标达标

- [ ] 8.4 错误场景测试
  - 测试网络错误时的反馈
  - 测试元素被移除时的反馈
  - 测试快速连按 Enter 的行为
  - 验收标准：所有错误场景都有适当处理

- [ ] 8.5 跨浏览器测试
  - 在 Chrome 上测试完整流程
  - 在 Firefox 上测试完整流程
  - 验证样式和动画在两个浏览器上一致
  - 验收标准：跨浏览器兼容性良好

## 9. 代码审查和清理

- [ ] 9.1 代码风格检查
  - 运行 `npm run lint` 检查代码
  - 运行 `npm run lint:fix` 自动修复
  - 确保无新的 ESLint 错误
  - 验收标准：ESLint 无错误

- [ ] 9.2 添加注释
  - 为关键方法添加 JSDoc 注释
  - 解释微任务调度的原理
  - 说明状态流转逻辑
  - 验收标准：代码注释清晰完整

## 总时间估算

- 基础结构改造：30 分钟
- 步骤生成逻辑：20 分钟
- UI 组件实现：1.5 小时
- 核心执行流程：1 小时
- 消息监听器集成：30 分钟
- 错误处理：30 分钟
- 可选优化：30 分钟
- 测试和验证：1 小时
- 代码审查和清理：20 分钟

**总计**：约 5-6 小时

## 任务依赖关系

```
基础结构 (1.1-1.2)
    ↓
步骤生成 (2.1-2.2)
    ↓
UI 组件 (3.1-3.4)
    ↓
核心流程 (4.1-4.5)
    ↓
消息监听器 (5.1-5.3)
    ↓
错误处理 (6.1-6.2)
    ↓
可选优化 (7.1-7.2)
    ↓
测试验证 (8.1-8.5)
    ↓
代码审查 (9.1-9.2)
```
