# Spec: 渐进式步骤反馈

定义渐进式步骤反馈能力，负责在 AI DOM 修改过程中为用户提供实时进度反馈。

## ADDED Requirements

### Requirement: 即时步骤显示

系统 SHALL 在用户按 Enter 后立即显示进度步骤列表，反馈延迟不得超过 10ms。

#### Scenario: 明确指令的步骤显示

- **WHEN** 用户输入明确指令（如"把背景改成红色"）并按 Enter
- **THEN** 系统立即显示 3 个步骤：
  - ○ 提取元素信息
  - ○ AI 正在思考...
  - ○ 应用修改

#### Scenario: 模糊指令的步骤显示

- **WHEN** 用户输入模糊指令（如"让这个更现代"）并按 Enter
- **THEN** 系统立即显示 6 个步骤：
  - ○ 提取元素信息
  - ○ 提取父元素信息
  - ○ 分析兄弟元素
  - ○ 分析页面布局
  - ○ AI 正在思考...
  - ○ 应用修改

#### Scenario: 反馈延迟要求

- **WHEN** 用户按 Enter
- **THEN** 步骤列表 SHALL 在 10ms 内显示
- **AND** 用户不应感觉到任何延迟或卡顿

### Requirement: 动态步骤生成

系统 SHALL 根据用户指令类型动态生成步骤列表。

#### Scenario: 明确指令的步骤生成

- **WHEN** `isFuzzyPrompt()` 返回 false
- **THEN** 系统生成包含 3 个步骤的列表
- **AND** 不包含"提取父元素"、"分析兄弟元素"、"分析页面布局"步骤

#### Scenario: 模糊指令的步骤生成

- **WHEN** `isFuzzyPrompt()` 返回 true
- **THEN** 系统生成包含 6 个步骤的列表
- **AND** 包含完整的分析和推断步骤

### Requirement: 步骤状态实时更新

系统 SHALL 在每个操作步骤完成后立即更新步骤状态。

#### Scenario: 步骤状态流转

- **WHEN** 步骤开始执行
- **THEN** 状态从 `pending` 变为 `running`
- **AND** 显示 spinner 动画和蓝色高亮

- **WHEN** 步骤成功完成
- **THEN** 状态从 `running` 变为 `completed`
- **AND** 显示绿色勾号
- **AND** 步骤变为半透明

- **WHEN** 步骤执行失败
- **THEN** 状态从 `running` 变为 `failed`
- **AND** 显示红色叉号
- **AND** 显示错误消息
- **AND** 停止后续步骤执行

#### Scenario: 多步骤并发更新

- **WHEN** 多个步骤依次完成
- **THEN** 系统按顺序更新每个步骤的状态
- **AND** 同时保持其他步骤的状态不变

### Requirement: 微任务调度

系统 SHALL 使用微任务调度机制确保浏览器有机会更新 UI。

#### Scenario: 微任务插入时机

- **WHEN** 执行同步操作（如元素信息提取）前后
- **THEN** 系统插入 `await Promise.resolve()`
- **AND** 让浏览器在下一个事件循环前更新 DOM

#### Scenario: 确保可见性

- **WHEN** 更新步骤状态后
- **THEN** 系统插入 `await Promise.resolve()`
- **AND** 确保用户看到状态变化

### Requirement: 步骤图标规范

系统 SHALL 使用标准图标表示不同的步骤状态。

#### Scenario: 待处理状态

- **WHEN** 步骤状态为 `pending`
- **THEN** 显示灰色圆圈图标 `○`

#### Scenario: 进行中状态

- **WHEN** 步骤状态为 `running`
- **THEN** 显示旋转的 spinner 图标 `⏳`
- **AND** spinner SHALL 持续旋转

#### Scenario: 已完成状态

- **WHEN** 步骤状态为 `completed`
- **THEN** 显示绿色勾号 `✓`

#### Scenario: 失败状态

- **WHEN** 步骤状态为 `failed`
- **THEN** 显示红色叉号 `✗`

### Requirement: 步骤视觉样式

系统 SHALL 使用清晰的颜色和动画区分不同的步骤状态。

#### Scenario: 已完成步骤样式

- **WHEN** 步骤状态为 `completed`
- **THEN** 文本颜色为绿色 (#4caf50)
- **AND** 不透明度为 0.7（半透明）

#### Scenario: 进行中步骤样式

- **WHEN** 步骤状态为 `running`
- **THEN** 文本颜色为蓝色 (#2196F3)
- **AND** 字体加粗（font-weight: 500）
- **AND** 图标显示旋转动画

#### Scenario: 待处理步骤样式

- **WHEN** 步骤状态为 `pending`
- **THEN** 文本颜色为灰色 (#888)

#### Scenario: 失败步骤样式

- **WHEN** 步骤状态为 `failed`
- **THEN** 文本颜色为红色 (#f44336)

### Requirement: 防止重复提交

系统 SHALL 防止用户快速连续按 Enter 导致的重复提交。

#### Scenario: 快速连按 Enter

- **WHEN** 用户在提交过程中再次按 Enter
- **THEN** 系统忽略后续的提交请求
- **AND** 在控制台输出警告日志

#### Scenario: 提交标志重置

- **WHEN** 提交完成（成功或失败）
- **THEN** 系统重置提交标志
- **AND** 允许用户再次提交

### Requirement: 错误处理和显示

系统 SHALL 在步骤失败时提供清晰的错误反馈。

#### Scenario: 单个步骤失败

- **WHEN** 某个步骤执行失败
- **THEN** 系统更新该步骤状态为 `failed`
- **AND** 显示错误消息
- **AND** 停止执行后续步骤
- **AND** 显示"关闭"按钮

#### Scenario: 错误消息格式

- **WHEN** 显示错误消息
- **THEN** 错误消息 SHALL 包含：
  - 失败的步骤名称
  - 失败的原因（简短描述）
- **AND** 错误消息 SHALL 被转义以防止 XSS

### Requirement: 对话框内容替换

系统 SHALL 在 AI 对话框中替换内容显示进度，而不是创建新的对话框。

#### Scenario: 替换对话框内容

- **WHEN** 开始显示进度
- **THEN** 系统替换 `aiDialog.innerHTML` 的内容
- **AND** 保持对话框的位置和样式
- **AND** 保持对话框在原有位置

#### Scenario: 进度完成后的状态转换

- **WHEN** 所有步骤完成
- **THEN** 系统再次替换对话框内容
- **AND** 显示成功或错误状态
- **AND** 提供"继续选择"或"关闭"按钮

### Requirement: 细粒度进度提示（可选）

系统 SHOULD 在"分析页面布局"步骤中显示更细的进度信息。

#### Scenario: 分析配色系统

- **WHEN** 系统分析页面配色
- **THEN** 当前步骤文本更新为"正在分析配色..."
- **AND** 等待配色分析完成

#### Scenario: 分析字体系统

- **WHEN** 系统分析页面字体
- **THEN** 当前步骤文本更新为"正在分析字体..."
- **AND** 等待字体分析完成

#### Scenario: 完成分析布局步骤

- **WHEN** 所有子分析完成
- **THEN** "分析页面布局"步骤标记为完成
- **AND** 继续下一步骤
