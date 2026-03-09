# Spec: 样式上下文提取

定义样式上下文提取能力，负责从页面中提取元素样式、层级关系和设计上下文信息。

## ADDED Requirements

### Requirement: 扩展的样式属性提取

系统 SHALL 从目标元素中提取至少 50 个 CSS 属性，涵盖颜色、排版、布局、尺寸、边框、视觉效果和交互状态等完整维度。

#### Scenario: 提取目标元素的完整样式信息

- **WHEN** 用户选中一个页面元素
- **THEN** 系统提取该元素的计算样式，包括：
  - 颜色系统：color, backgroundColor, borderColor, outlineColor, boxShadow
  - 排版系统：fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textAlign, textDecoration, textTransform, verticalAlign
  - 布局系统：display, position, flexDirection, justifyContent, alignItems, gap
  - 尺寸系统：width, height, minWidth, minHeight, maxWidth, maxHeight, padding, margin
  - 边框和圆角：border, borderRadius, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius
  - 视觉效果：boxShadow, opacity, filter
  - 交互状态：cursor, transition, transform

#### Scenario: 样式信息格式化

- **WHEN** 样式信息被发送给 AI 模型
- **THEN** 系统只包含非空且有意义的样式属性值
- **AND** 样式信息以易于阅读的格式呈现

### Requirement: 父元素上下文提取

系统 SHALL 提取目标元素直接父元素的样式信息，帮助 AI 理解元素在容器中的角色和上下文。

#### Scenario: 提取父元素信息

- **WHEN** 用户选中一个有父元素的元素
- **THEN** 系统提取父元素的以下信息：
  - tagName：父元素的标签名
  - className：父元素的类名（如果有）
  - computedStyles：父元素的完整计算样式

#### Scenario: 处理无父元素的情况

- **WHEN** 用户选中根元素（如 body）
- **THEN** 系统不包含父元素上下文
- **AND** parentContext 字段为 undefined

### Requirement: 兄弟元素上下文提取

系统 SHALL 查找并提取目标元素的兄弟元素信息，识别相似元素，帮助 AI 理解"和那个一样"的指令。

#### Scenario: 提取相似兄弟元素

- **WHEN** 用户选中一个有兄弟元素的元素
- **THEN** 系统执行以下操作：
  - 获取同父元素下的所有子元素（排除目标元素本身）
  - 只分析前 5 个兄弟元素
  - 计算每个兄弟元素与目标元素的样式相似度
  - 只保留相似度大于 0.3 的兄弟元素
  - 按相似度降序排序

#### Scenario: 相似度计算

- **WHEN** 系统计算两个元素的样式相似度
- **THEN** 系统比较以下关键样式属性：
  - display, color, backgroundColor, fontSize, fontWeight, borderRadius, padding, margin
- **AND** 相似度 = 匹配的属性数量 / 总属性数量
- **AND** 相似度值为 0 到 1 之间的小数

#### Scenario: 处理无兄弟元素的情况

- **WHEN** 目标元素没有兄弟元素
- **OR** 所有兄弟元素的相似度都 <= 0.3
- **THEN** siblingContext 为空数组

### Requirement: 按需上下文提取

系统 SHALL 根据用户指令的明确程度，智能选择提取的上下文层级。

#### Scenario: 明确指令使用基础样式信息

- **WHEN** 用户指令包含明确的属性关键词（如"颜色"、"背景"、"字体"）
- **THEN** 系统只提取目标元素的基础样式信息
- **AND** 不提取父元素和兄弟元素上下文
- **AND** 不分析页面设计系统

#### Scenario: 模糊指令使用完整上下文

- **WHEN** 用户指令包含模糊的目标关键词（如"现代"、"优雅"、"优化"）
- **THEN** 系统提取目标元素的完整样式信息
- **AND** 提取父元素和兄弟元素上下文
- **AND** 分析页面设计系统

### Requirement: 样式信息类型安全

系统 SHALL 使用 TypeScript 类型定义确保所有提取的样式信息都是类型安全的。

#### Scenario: ElementInfo 类型定义

- **WHEN** ElementInfo 接口被定义
- **THEN** 它包含以下必需字段：
  - tagName: string
  - outerHTML: string
  - computedStyles: Record<string, string>
- **AND** 它包含以下可选字段：
  - id?: string
  - className?: string
  - textContent?: string
  - parentContext?: ParentElementInfo
  - siblingContext?: SiblingElementInfo[]
  - pageDesignSystem?: PageDesignSystem

#### Scenario: 上下文类型定义

- **WHEN** ParentElementInfo 被定义
- **THEN** 它包含：tagName, className?, computedStyles

- **WHEN** SiblingElementInfo 被定义
- **THEN** 它包含：tagName, className?, computedStyles, similarity: number

### Requirement: 性能约束

系统 SHALL 在规定时间内完成样式信息提取，避免影响用户体验。

#### Scenario: 基础样式提取性能

- **WHEN** 系统只提取目标元素的样式信息
- **THEN** 提取时间 SHALL 小于 10ms

#### Scenario: 层级上下文提取性能

- **WHEN** 系统提取父元素和兄弟元素上下文
- **THEN** 提取时间 SHALL 小于 40ms

### Requirement: 向后兼容性

系统 SHALL 保持与现有 AI DOM 修改功能的向后兼容性。

#### Scenario: 现有功能不受影响

- **WHEN** 现有代码使用 ElementInfo 接口
- **THEN** 所有新增字段都是可选的
- **AND** 现有代码无需修改即可继续工作
- **AND** 不包含上下文信息时，系统行为与之前一致
