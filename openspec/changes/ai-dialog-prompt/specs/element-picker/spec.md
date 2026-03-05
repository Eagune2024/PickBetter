## MODIFIED Requirements

### Requirement: 状态管理
元素选择器 SHALL 使用三状态机管理选择器状态，而非单一的激活/非激活布尔值。

#### Scenario: 状态定义
- **WHEN** 元素选择器初始化
- **THEN** 系统应支持三种状态：IDLE（未激活）、PICKING（选择中）、SELECTED（已选中并显示对话框）
- **AND** 初始状态应为 IDLE

#### Scenario: IDLE 到 PICKING 转换
- **WHEN** 用户调用 startPicker() 方法
- **THEN** 系统应从 IDLE 状态转换为 PICKING 状态
- **AND** 系统应创建并显示高亮覆盖层和信息标签

#### Scenario: PICKING 到 SELECTED 转换
- **WHEN** 用户在 PICKING 状态下点击页面元素
- **THEN** 系统应从 PICKING 状态转换为 SELECTED 状态
- **AND** 系统应显示 AI 对话框
- **AND** 系统应保持元素高亮

#### Scenario: SELECTED 到 PICKING 转换
- **WHEN** 用户在 SELECTED 状态下按下 Enter 或 ESC
- **THEN** 系统应从 SELECTED 状态转换为 PICKING 状态
- **AND** 系统应隐藏 AI 对话框
- **AND** 系统应允许用户继续选择其他元素

#### Scenario: PICKING 到 IDLE 转换
- **WHEN** 用户在 PICKING 状态下按下 ESC 键
- **THEN** 系统应从 PICKING 状态转换为 IDLE 状态
- **AND** 系统应清理所有覆盖层元素
- **AND** 系统应停止监听所有事件

### Requirement: 鼠标事件处理
元素选择器 SHALL 根据当前状态过滤鼠标事件，只在 PICKING 状态下响应鼠标悬浮和点击。

#### Scenario: PICKING 状态下的鼠标悬浮
- **WHEN** 系统处于 PICKING 状态
- **AND** 用户将鼠标悬浮到页面元素上
- **THEN** 系统应高亮该元素
- **AND** 系统应显示信息标签
- **AND** 系统应阻止默认行为和事件传播

#### Scenario: PICKING 状态下的元素点击
- **WHEN** 系统处于 PICKING 状态
- **AND** 用户点击页面元素（非对话框元素）
- **THEN** 系统应选中该元素
- **AND** 系统应转换为 SELECTED 状态
- **AND** 系统应显示 AI 对话框
- **AND** 系统应阻止页面的默认点击行为

#### Scenario: SELECTED 状态下的鼠标悬浮
- **WHEN** 系统处于 SELECTED 状态
- **AND** 用户将鼠标悬浮到任何页面元素上
- **THEN** 系统不应更新高亮效果
- **AND** 系统不应显示或更新信息标签

#### Scenario: SELECTED 状态下的元素点击
- **WHEN** 系统处于 SELECTED 状态
- **AND** 用户点击任何页面元素
- **THEN** 系统不应触发选择逻辑
- **AND** 系统应保持 SELECTED 状态

#### Scenario: 对话框元素的防护
- **WHEN** 用户在任何状态下点击或悬浮对话框元素
- **THEN** 对话框元素不应触发选择器的事件处理
- **AND** 系统应使用 closest('.picker-ai-dialog') 检测并忽略对话框元素

### Requirement: 键盘事件处理
元素选择器 SHALL 根据当前状态响应不同的键盘快捷键。

#### Scenario: PICKING 状态下的 ESC
- **WHEN** 系统处于 PICKING 状态
- **AND** 用户按下 ESC 键
- **THEN** 系统应停止选择器
- **AND** 系统应转换为 IDLE 状态
- **AND** 系统应清理所有覆盖层元素

#### Scenario: SELECTED 状态下的 Enter
- **WHEN** 系统处于 SELECTED 状态
- **AND** 用户在对话框输入框中按下 Enter 键
- **THEN** 系统应提交 prompt
- **AND** 系统应输出信息到 console
- **AND** 系统应转换为 PICKING 状态

#### Scenario: SELECTED 状态下的 ESC
- **WHEN** 系统处于 SELECTED 状态
- **AND** 用户按下 ESC 键
- **THEN** 系统应取消对话框
- **AND** 系统应转换为 PICKING 状态
- **AND** 系统不应停止选择器

#### Scenario: IDLE 状态下的键盘事件
- **WHEN** 系统处于 IDLE 状态
- **AND** 用户按下任何键
- **THEN** 系统不应响应键盘事件
- **AND** 系统应保持 IDLE 状态

### Requirement: 覆盖层管理
元素选择器应根据状态动态管理覆盖层元素的显示和隐藏。

#### Scenario: PICKING 状态下的覆盖层
- **WHEN** 系统处于 PICKING 状态
- **THEN** 高亮覆盖层应根据鼠标悬浮位置动态更新
- **AND** 信息标签应显示当前悬浮元素的信息
- **AND** AI 对话框不应显示

#### Scenario: SELECTED 状态下的覆盖层
- **WHEN** 系统处于 SELECTED 状态
- **THEN** 高亮覆盖层应继续显示在选中元素上
- **AND** 信息标签应隐藏
- **AND** AI 对话框应显示

#### Scenario: 状态转换时的覆盖层更新
- **WHEN** 系统从 SELECTED 转换为 PICKING 状态
- **THEN** AI 对话框应被移除
- **AND** 信息标签应在下次鼠标悬浮时恢复显示
- **AND** 高亮覆盖层应继续工作

#### Scenario: 停止选择器时的清理
- **WHEN** 系统从任何状态转换为 IDLE 状态
- **THEN** 所有覆盖层元素应被移除
- **AND** 所有 DOM 引用应被清空
- **AND** 所有事件监听器应被分离

### Requirement: 元素信息输出
元素选择器 SHALL 在 SELECTED 状态下提交 prompt 时输出元素信息和用户输入。

#### Scenario: 提交 prompt 时的输出
- **WHEN** 用户在 SELECTED 状态下按下 Enter 键
- **THEN** 系统应输出用户的 prompt 到 console
- **AND** 系统应输出选中元素的信息（tagName、id、className、dimensions、textContent）
- **AND** 输出格式应为 '[ElementPicker] AI Prompt: <prompt>' 和 '[ElementPicker] 选中元素: <info>'

#### Scenario: 空 prompt 的输出
- **WHEN** 用户在输入框为空时按下 Enter 键
- **THEN** 系统应输出空字符串作为 prompt
- **AND** 系统应正常输出选中元素信息

#### Scenario: 控制台输出位置
- **WHEN** 系统输出 prompt 和元素信息
- **THEN** 输出应发送到当前页面的浏览器 console
- **AND** 输出不应发送到 Popup 或 Background Script
