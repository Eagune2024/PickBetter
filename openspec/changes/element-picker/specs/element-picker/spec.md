# Element Picker Capability Specification

## Overview

元素选择器能力允许用户通过可视化方式在网页上选择元素。用户点击 Popup 中的"选择元素"按钮后,Content Script 进入选择模式,鼠标悬浮时元素高亮显示,点击元素时输出元素信息到控制台。

## ADDED Requirements

### Requirement: 启动元素选择模式

系统 MUST 提供一种机制,允许用户从 Popup 启动元素选择模式。当用户点击"选择元素"按钮时,系统 MUST 向当前活动标签页的 Content Script 发送 `START_PICKER` 消息。

#### Scenario: 成功启动选择模式
- **WHEN** 用户在 Popup 中点击"选择元素"按钮
- **THEN** 系统 MUST 向 Content Script 发送 `START_PICKER` 消息
- **AND** Popup 按钮 MUST 显示为"选择模式中..."状态
- **AND** Popup MUST 显示提示文本"在页面上点击元素,按ESC退出"

#### Scenario: Content Script 未注入
- **WHEN** 用户在 Content Script 未注入的页面点击"选择元素"按钮
- **THEN** 系统 MUST 显示错误提示"请刷新页面后重试"
- **AND** 系统 MUST 在控制台记录错误信息

#### Scenario: 重复点击按钮
- **WHEN** 选择模式已激活时用户再次点击"选择元素"按钮
- **THEN** 系统 MUST 禁用按钮
- **AND** 系统 MUST 不发送重复的 `START_PICKER` 消息

---

### Requirement: 元素悬浮高亮

当选择模式激活时,系统 MUST 在鼠标悬浮到元素上时高亮显示该元素。高亮样式 MUST 使用蓝色边框 (`outline: 2px solid #2196F3`),MUST 优先于页面样式,且 MUST 不影响元素布局。

#### Scenario: 鼠标悬浮到元素
- **WHEN** 选择模式激活且用户将鼠标悬浮到某个元素上
- **THEN** 系统 MUST 显示蓝色边框高亮该元素
- **AND** 系统 MUST 设置鼠标光标为 `crosshair`
- **AND** 系统 MUST 在控制台记录高亮的元素信息(可选)

#### Scenario: 鼠标移动到其他元素
- **WHEN** 用户将鼠标从当前元素移动到另一个元素
- **THEN** 系统 MUST 移除旧元素的高亮样式
- **AND** 系统 MUST 高亮显示新的元素
- **AND** 高亮切换 MUST 平滑无闪烁

#### Scenario: 高亮样式不被覆盖
- **WHEN** 页面元素有自定义的 outline 样式(包括 `!important`)
- **THEN** 系统 MUST 使用 `!important` 确保高亮样式优先级最高
- **AND** 高亮样式 MUST 始终可见

---

### Requirement: 点击选中元素

当选择模式激活时,系统 MUST 在用户点击元素时输出元素基本信息到控制台,并自动退出选择模式。点击事件 MUST 触发页面的默认行为(如链接跳转)。

#### Scenario: 点击元素输出信息
- **WHEN** 选择模式激活且用户点击某个元素
- **THEN** 系统 MUST 在控制台输出元素信息,包括:
  - `tagName`: 元素标签名(如 "DIV", "BUTTON")
  - `id`: 元素 ID(如果有)
  - `className`: 元素类名(如果有)
  - `textContent`: 元素文本内容(截断到前50个字符)
- **AND** 系统 MUST 退出选择模式
- **AND** 系统 MUST 移除所有高亮样式

#### Scenario: 点击链接不跳转
- **WHEN** 用户点击一个链接 (`<a>` 标签)
- **THEN** 系统 MUST 阻止链接跳转
- **AND** 系统 MUST 输出元素信息到控制台
- **AND** 系统 MUST 退出选择模式

#### Scenario: 点击按钮不触发
- **WHEN** 用户点击一个按钮 (`<button>` 标签)
- **THEN** 系统 MUST 阻止按钮的点击事件
- **AND** 系统 MUST 输出元素信息到控制台
- **AND** 系统 MUST 退出选择模式

---

### Requirement: 键盘快捷键取消

系统 MUST 支持使用 ESC 键取消元素选择模式。当用户按下 ESC 键时,系统 MUST 立即退出选择模式并清理所有高亮样式。

#### Scenario: 按 ESC 键取消
- **WHEN** 选择模式激活且用户按下 ESC 键
- **THEN** 系统 MUST 立即退出选择模式
- **AND** 系统 MUST 移除所有元素的高亮样式
- **AND** 系统 MUST 在控制台记录"选择模式已退出"
- **AND** Popup MUST 恢复按钮为"🎯 选择元素"状态

#### Scenario: 非 ESC 键不退出
- **WHEN** 用户按下除 ESC 外的其他键
- **THEN** 系统 MUST 保持选择模式激活
- **AND** 系统 MUST 不退出选择模式

---

### Requirement: 消息类型定义

系统 MUST 在 `source/types/messages.ts` 中定义新的消息类型,用于 Popup 和 Content Script 之间的通信。

#### Scenario: START_PICKER 消息类型
- **WHEN** 系统定义消息类型
- **THEN** 系统 MUST 包含 `StartPickerMessage` 接口:
  ```typescript
  export interface StartPickerMessage {
    type: 'START_PICKER';
  }
  ```
- **AND** 系统 MUST 将其添加到 `ExtensionMessage` 联合类型

#### Scenario: STOP_PICKER 消息类型
- **WHEN** 系统定义消息类型
- **THEN** 系统 MUST 包含 `StopPickerMessage` 接口:
  ```typescript
  export interface StopPickerMessage {
    type: 'STOP_PICKER';
  }
  ```
- **AND** 系统 MUST 将其添加到 `ExtensionMessage` 联合类型

---

### Requirement: Content Script 模块组织

系统 MUST 将元素选择器实现为独立的模块,导出清晰的 API 函数。模块 MUST 封装所有选择器逻辑,包括事件监听、样式管理和状态控制。

#### Scenario: 导出启动函数
- **WHEN** Content Script 加载元素选择器模块
- **THEN** 系统 MUST 导出 `startPicker()` 函数
- **AND** 该函数 MUST 接受无参数
- **AND** 该函数 MUST 启动选择模式

#### Scenario: 导出停止函数
- **WHEN** Content Script 加载元素选择器模块
- **THEN** 系统 MUST 导出 `stopPicker()` 函数
- **AND** 该函数 MUST 接受无参数
- **AND** 该函数 MUST 停止选择模式并清理所有副作用

#### Scenario: 单例模式
- **WHEN** 多次调用 `startPicker()` 函数
- **THEN** 系统 MUST 复用同一个 `ElementPicker` 实例
- **AND** 系统 MUST 避免创建多个选择器实例

---

### Requirement: 事件处理优先级

系统 MUST 在事件捕获阶段监听和处理所有事件,确保选择器的事件处理器优先于页面的其他事件处理器执行。

#### Scenario: 捕获阶段监听
- **WHEN** 系统注册事件监听器
- **THEN** 系统 MUST 使用 `{ capture: true }` 选项
- **AND** 系统 MUST 监听 `mouseover`, `click`, `keydown` 事件

#### Scenario: 阻止事件传播
- **WHEN** 选择模式激活且事件触发
- **THEN** 系统 MUST 调用 `e.preventDefault()` 阻止默认行为
- **AND** 系统 MUST 调用 `e.stopPropagation()` 阻止事件冒泡
- **AND** 系统事件处理 MUST 优先于页面的其他处理器

---

### Requirement: 状态清理

系统 MUST 在退出选择模式时完整清理所有副作用,包括移除事件监听器、清理高亮样式和重置内部状态。

#### Scenario: 退出时移除事件监听器
- **WHEN** 系统退出选择模式
- **THEN** 系统 MUST 移除所有事件监听器
- **AND** 系统 MUST 使用相同的 `{ capture: true }` 选项

#### Scenario: 退出时清理高亮样式
- **WHEN** 系统退出选择模式
- **THEN** 系统 MUST 移除当前高亮元素的样式
- **AND** 系统 MUST 重置 `outline`, `outline-offset`, `cursor` 属性

#### Scenario: 退出时重置内部状态
- **WHEN** 系统退出选择模式
- **THEN** 系统 MUST 将 `isActive` 设置为 `false`
- **AND** 系统 MUST 将 `currentElement` 设置为 `null`
- **AND** 系统 MUST 允许重新启动选择模式

---

## Non-Functional Requirements

### 性能

- 选择模式启动时间 MUST 小于 100ms
- 鼠标悬浮高亮响应时间 MUST 小于 16ms (60fps)
- 点击元素到退出的响应时间 MUST 小于 50ms

### 兼容性

- 功能 MUST 在 Chrome 88+ 上正常工作
- 功能 MUST 在 Firefox 112+ 上正常工作
- 功能 MUST 不影响现有扩展功能
- Content Script MUST 作为 IIFE 打包

### 可维护性

- 代码 MUST 遵循项目的 TypeScript 编码规范
- 代码 MUST 通过 ESLint 检查
- 模块 MUST 有清晰的类型定义
- 关键逻辑 MUST 有注释说明

### 安全性

- 选择模式 MUST 只在用户主动启动时激活
- 事件处理 MUST 不干扰页面的正常功能
- 样式注入 MUST 不破坏页面的样式隔离

---

## Test Scenarios

### 基础功能测试

#### Scenario: 完整的选择流程
- **WHEN** 用户点击"选择元素"按钮
- **AND** 鼠标悬浮到某个元素
- **AND** 点击该元素
- **THEN** 系统 MUST 输出元素信息到控制台
- **AND** 系统 MUST 自动退出选择模式

#### Scenario: ESC 取消流程
- **WHEN** 用户点击"选择元素"按钮
- **AND** 悬浮到某个元素
- **AND** 按下 ESC 键
- **THEN** 系统 MUST 退出选择模式
- **AND** 系统 MUST 清理所有高亮样式

### 边界情况测试

#### Scenario: 在特殊元素上使用
- **GIVEN** 页面包含 `<video>`, `<canvas>`, `<svg>` 元素
- **WHEN** 用户启动选择模式并悬浮到这些元素
- **THEN** 系统 MUST 尝试高亮显示(结果可能因元素类型而异)

#### Scenario: 快速移动鼠标
- **WHEN** 用户快速移动鼠标经过多个元素
- **THEN** 系统 MUST 正确高亮当前悬浮的元素
- **AND** 系统 MUST 不出现高亮残留

#### Scenario: 页面滚动
- **WHEN** 用户在选择模式下滚动页面
- **THEN** 高亮边框 MUST 跟随元素移动
- **AND** 系统 MUST 保持选择模式激活

### 错误处理测试

#### Scenario: Content Script 未注入
- **WHEN** 用户在 `chrome://` 页面点击"选择元素"按钮
- **THEN** 系统 MUST 显示友好的错误提示
- **AND** 系统 MUST 不抛出未捕获的异常

#### Scenario: 页面有冲突的事件监听器
- **GIVEN** 页面有自定义的 `mouseover` 或 `click` 事件监听器
- **WHEN** 用户启动选择模式并与页面交互
- **THEN** 选择器的事件 MUST 优先执行
- **AND** 页面的事件 MUST 不被触发
