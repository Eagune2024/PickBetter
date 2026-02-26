## Why

浏览器扩展需要提供一个类似 DevTools 的元素选择功能,允许用户在网页上可视化地选择元素。当前扩展缺少这个基础能力,限制了用户与页面元素的交互方式。添加元素选择器将为未来的功能(如元素信息提取、选择器生成、自动化测试辅助等)奠定基础。

## What Changes

- **新增功能**: Content Script 中实现元素选择器模块
  - 提供启动/停止选择模式的 API
  - 鼠标悬浮时高亮显示元素(蓝色边框)
  - 点击元素时输出元素信息到控制台
  - 支持 ESC 键取消选择模式

- **Popup UI 更新**: 添加"选择元素"按钮
  - 点击按钮向 Content Script 发送启动消息
  - 显示选择模式状态和操作提示
  - 处理 Content Script 未注入的错误情况

- **消息类型扩展**: 在 `source/types/messages.ts` 中添加新的消息类型
  - `START_PICKER`: 启动元素选择模式
  - `STOP_PICKER`: 停止元素选择模式

- **代码结构调整**: 在 Content Script 中添加独立的元素选择器模块
  - `source/ContentScript/elementPicker.ts`: 核心选择器实现
  - 导出 `startPicker()` 和 `stopPicker()` 函数

## Capabilities

### New Capabilities

- **element-picker**: 提供网页元素可视化选择能力,支持鼠标悬浮高亮、点击选中、键盘快捷键(ESC取消)等交互方式。通过消息通信与 Popup 集成,作为扩展的基础功能模块。

### Modified Capabilities

无(现有功能的需求没有变化,仅添加新功能)

## Impact

**影响的代码模块**:
- `source/ContentScript/index.ts`: 添加消息处理逻辑,导入并调用元素选择器模块
- `source/ContentScript/elementPicker.ts`: **新增文件**,实现核心选择器功能
- `source/types/messages.ts`: 扩展 `ExtensionMessage` 联合类型,添加新消息类型
- `source/Popup/Popup.tsx`: 添加"选择元素"按钮和相关状态管理
- `source/Popup/Popup.module.scss`: 添加按钮和提示文本的样式

**新增依赖**: 无(使用现有的 WebExtension API 和标准 DOM API)

**兼容性影响**:
- 所有支持浏览器(Chrome、Firefox、Opera、Edge)均支持
- 不影响现有功能,完全向后兼容
- Content Script 作为 IIFE 打包,不受影响

**用户体验**:
- Popup 新增一个直观的按钮,用户可以轻松启动元素选择模式
- 选择过程中有清晰的视觉反馈(蓝色边框高亮)
- 支持键盘快捷键(ESC)快速退出,符合用户习惯
