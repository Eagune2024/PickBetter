## Why

当前元素选择器选中元素后会立即退出激活模式，仅将元素信息输出到 console。这限制了用户的交互能力，用户无法基于选中的元素进行进一步操作。添加 AI 对话框可以让用户输入自然语言描述如何调整元素，为后续的 AI 驱动元素操作奠定基础。

## What Changes

- 扩展元素选择器的状态管理，从单一的激活/非激活状态扩展为三种状态（IDLE / PICKING / SELECTED）
- 选中元素后不退出选择器模式，而是显示浮动 AI 对话框
- 对话框包含纯输入框和提示文字，无按钮
- 支持快捷键：Enter 提交 prompt，ESC 取消对话框并返回 PICKING 状态
- 对话框使用智能定位算法，优先放在元素外部，无空间时放在元素内部左上角
- 提交后输出 prompt 和元素信息到 console（AI 交互实现为下一阶段任务）

## Capabilities

### New Capabilities
- `picker-ai-dialog`: 选中元素后弹出浮动对话框，允许用户输入自然语言 prompt 描述想要的调整

### Modified Capabilities
- `element-picker`: 扩展元素选择器的状态管理和交互流程，支持 SELECTED 状态和对话框显示

## Impact

**代码影响**:
- `source/ContentScript/elementPicker.ts`: 需要重构状态管理（`isActive` → `state: PickerState`），新增对话框 DOM 元素和相关方法

**API 影响**:
- 无新增消息类型（对话框功能完全在 Content Script 内部实现）
- 对 Popup 无影响（UI 交互在页面覆盖层中完成）

**依赖影响**:
- 无新增外部依赖
- 对话框样式使用内联 CSS，复用现有的覆盖层模式
