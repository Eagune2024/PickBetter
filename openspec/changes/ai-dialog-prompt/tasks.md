## 1. 状态管理重构

- [x] 1.1 添加 PickerState 类型定义
  - 在 `elementPicker.ts` 顶部添加 `type PickerState = 'IDLE' | 'PICKING' | 'SELECTED'`
  - 验收：类型定义正确，无 TypeScript 错误

- [x] 1.2 替换 isActive 为 state 属性
  - 将 `private isActive = false` 替换为 `private state: PickerState = 'IDLE'`
  - 更新 `start()` 方法设置 `this.state = 'PICKING'`
  - 更新 `stop()` 方法设置 `this.state = 'IDLE'`
  - 验收：编译通过，start() 和 stop() 正确设置状态

- [x] 1.3 添加 selectedElement 属性
  - 添加 `private selectedElement: HTMLElement | null = null`
  - 验收：属性定义正确

- [x] 1.4 更新 start() 方法的状态检查
  - 修改 `if (this.isActive)` 为 `if (this.state === 'PICKING')`
  - 验收：重复点击 start 不会重复初始化

- [x] 1.5 更新 stop() 方法的状态检查
  - 修改 `if (!this.isActive)` 为 `if (this.state === 'IDLE')`
  - 验收：在 IDLE 状态调用 stop 不报错

## 2. 对话框 DOM 元素实现

- [x] 2.1 添加对话框属性定义
  - 添加 `private aiDialog: HTMLElement | null = null`
  - 添加 `private dialogInput: HTMLInputElement | null = null`
  - 验收：属性定义正确

- [x] 2.2 实现 createAiDialog() 方法
  - 创建对话框容器 div（`.picker-ai-dialog`）
  - 设置样式：深色背景、圆角、阴影、z-index: 2147483642
  - 创建标题 div："如何调整此元素?"
  - 创建输入框 input：placeholder、样式、focus 样式
  - 创建提示文字 div："按 Enter 提交，ESC 取消"
  - 组装 DOM 结构并添加到 overlayContainer
  - 验收：对话框显示正确，样式符合设计，输入框可聚焦

- [x] 2.3 实现 calculateDialogPosition() 方法
  - 定义对话框尺寸（宽 300px，高 120px）
  - 定义 4 个外部候选位置（右上、右下、左上、左下）
  - 实现视口检查逻辑，选择第一个合适的位置
  - 实现回退逻辑：所有外部位置都不行时，返回元素内左上角
  - 验收：对话框位置在各种屏幕尺寸和元素位置下都正确

- [x] 2.4 实现 getElementInfo() 辅助方法
  - 提取元素的 tagName、id、className、dimensions、textContent
  - 返回格式化的对象
  - 验收：返回的对象包含所有必要信息

## 3. 事件处理逻辑更新

- [x] 3.1 更新 handleMouseOverImpl() 状态检查
  - 修改 `if (!this.isActive)` 为 `if (this.state !== 'PICKING')`
  - 添加 `if (e.target.closest('.picker-ai-dialog')) return;` 防护
  - 验收：SELECTED 状态下鼠标悬浮不触发高亮

- [x] 3.2 更新 handleClickImpl() 状态检查
  - 修改 `if (!this.isActive)` 为 `if (this.state !== 'PICKING')`
  - 添加 `if (e.target.closest('.picker-ai-dialog')) return;` 防护
  - 修改点击后的逻辑：输出信息后设置 `this.state = 'SELECTED'` 并调用 `showAiDialog()`
  - 移除 `this.stop()` 调用
  - 验收：点击元素后进入 SELECTED 状态，显示对话框

- [x] 3.3 重构 handleKeyDownImpl() 支持三种状态
  - 实现 PICKING 状态的 ESC 处理：调用 `this.stop()`
  - 实现 SELECTED 状态的 ESC 处理：调用 `this.cancelAiDialog()`
  - 实现 SELECTED 状态的 Enter 处理：调用 `this.submitAiPrompt()`
  - 添加状态检查和事件阻止
  - 验收：所有状态的快捷键正确响应

## 4. 对话框交互方法实现

- [x] 4.1 实现 showAiDialog() 方法
  - 检查并创建对话框（如果不存在）
  - 隐藏信息标签 `this.infoLabel.style.display = 'none'`
  - 调用 `calculateDialogPosition()` 计算位置
  - 设置对话框位置并显示
  - 自动聚焦输入框 `this.dialogInput?.focus()`
  - 保存选中元素 `this.selectedElement = target`
  - 设置状态 `this.state = 'SELECTED'`
  - 验收：对话框显示在正确位置，输入框自动聚焦，信息标签隐藏

- [x] 4.2 实现 hideAiDialog() 方法
  - 移除对话框 DOM 元素 `this.aiDialog?.remove()`
  - 清空引用 `this.aiDialog = null`, `this.dialogInput = null`, `this.selectedElement = null`
  - 验收：对话框完全移除，引用清空

- [x] 4.3 实现 submitAiPrompt() 方法
  - 读取输入框值 `const prompt = this.dialogInput?.value || ''`
  - 输出到 console：`'[ElementPicker] AI Prompt: ${prompt}'`
  - 输出到 console：`'[ElementPicker] 选中元素:'` 和元素信息
  - 调用 `this.hideAiDialog()`
  - 设置状态 `this.state = 'PICKING'`
  - 验收：console 输出正确，对话框关闭，返回 PICKING 状态

- [x] 4.4 实现 cancelAiDialog() 方法
  - 调用 `this.hideAiDialog()`
  - 设置状态 `this.state = 'PICKING'`
  - 验收：对话框关闭，返回 PICKING 状态

## 5. 清理逻辑更新

- [x] 5.1 更新 cleanup() 方法
  - 在现有清理逻辑中添加对话框清理
  - 调用 `this.hideAiDialog()` 或手动清理对话框引用
  - 验收：stop() 调用后所有 DOM 元素和引用都被清理

- [x] 5.2 验证信息标签恢复逻辑
  - 确认 hideAiDialog() 不需要显式恢复信息标签
  - 确认下次 mouseover 时信息标签自动显示
  - 验收：SELECTED → PICKING 转换后，鼠标悬浮元素时信息标签正常显示

## 6. 测试与验证

- [ ] 6.1 状态转换测试
  - 测试 IDLE → PICKING → SELECTED → PICKING → IDLE 完整流程
  - 验收：所有状态转换正确，console 输出正确

- [ ] 6.2 对话框定位测试
  - 测试选中屏幕四角元素时的对话框位置
  - 测试选中屏幕中央小元素时的对话框位置
  - 测试选中屏幕中央大元素时的对话框位置（应放在内部）
  - 验收：对话框在所有情况下都显示在合适位置

- [ ] 6.3 事件隔离测试
  - SELECTED 状态下鼠标悬浮对话框，不应触发高亮
  - SELECTED 状态下点击对话框，不应触发选择
  - SELECTED 状态下鼠标悬浮其他元素，不应高亮
  - SELECTED 状态下点击其他元素，不应选择
  - 验收：所有事件正确隔离，对话框可正常交互

- [ ] 6.4 快捷键测试
  - PICKING 状态按 ESC，应退出选择器
  - SELECTED 状态按 Enter，应提交 prompt 并返回 PICKING
  - SELECTED 状态按 ESC，应取消对话框并返回 PICKING
  - 输入框为空时按 Enter，应正常处理
  - 验收：所有快捷键正确响应

- [ ] 6.5 跨浏览器测试
  - 在 Chrome 中测试所有功能
  - 在 Firefox 中测试所有功能
  - 验证 z-index、事件处理、样式在两个浏览器中一致
  - 验收：Chrome 和 Firefox 功能完全一致

- [ ] 6.6 主流网站兼容性测试
  - 在 GitHub 上测试对话框显示和交互
  - 在 Twitter/X 上测试对话框显示和交互
  - 在电商网站（如淘宝）上测试对话框显示和交互
  - 验收：对话框在所有测试网站上正确显示，不被页面样式覆盖

## 7. 代码质量与文档

- [x] 7.1 TypeScript 类型检查
  - 运行 `npm run build` 确保无类型错误
  - 验收：构建成功，无 TypeScript 错误

- [x] 7.2 ESLint 检查
  - 运行 `npm run lint` 确保代码符合规范
  - 验收：无 ESLint 错误

- [ ] 7.3 代码注释完善
  - 为新增的方法添加 JSDoc 注释
  - 为复杂逻辑添加行内注释
  - 验收：所有新增代码都有清晰的注释
