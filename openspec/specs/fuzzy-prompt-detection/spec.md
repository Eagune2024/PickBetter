# Spec: 模糊指令检测

定义模糊指令检测能力，负责判断用户指令是否明确，从而决定是否需要深度样式分析。

## ADDED Requirements

### Requirement: 明确指令识别

系统 SHALL 能够识别明确的修改指令，这些指令直接指定了要修改的属性或执行的操作。

#### Scenario: 识别颜色相关指令

- **WHEN** 用户指令包含以下关键词：
  - "颜色"、"背景"、"background"、"color"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别字体相关指令

- **WHEN** 用户指令包含以下关键词：
  - "字体"、"文字"、"text"、"font"、"大小"、"size"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别尺寸相关指令

- **WHEN** 用户指令包含以下关键词：
  - "大小"、"尺寸"、"width"、"height"、"size"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别边框和圆角指令

- **WHEN** 用户指令包含以下关键词：
  - "边框"、"border"、"圆角"、"rounded"、"radius"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别阴影指令

- **WHEN** 用户指令包含以下关键词：
  - "阴影"、"shadow"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别间距指令

- **WHEN** 用户指令包含以下关键词：
  - "间距"、"padding"、"margin"
- **THEN** 系统判断该指令为明确指令

#### Scenario: 识别删除和隐藏指令

- **WHEN** 用户指令包含以下关键词：
  - "删除"、"隐藏"、"显示"、"添加"、"delete"、"remove"
- **THEN** 系统判断该指令为明确指令

### Requirement: 模糊指令识别

系统 SHALL 能够识别模糊的描述性指令，这些指令描述的是一种感觉或效果，而非具体的属性修改。

#### Scenario: 识别风格相关指令

- **WHEN** 用户指令包含以下关键词：
  - "现代"、"时尚"、"复古"、"简洁"、"华丽"、"扁平"、"立体"
  - "优雅"、"专业"、"友好"、"严肃"、"活泼"
- **THEN** 系统判断该指令为模糊指令

#### Scenario: 识别比较相关指令

- **WHEN** 用户指令包含以下关键词：
  - "更好"、"更差"、"更美"、"更协调"、"更统一"、"更突出"、"更低调"、"更醒目"
- **THEN** 系统判断该指令为模糊指令

#### Scenario: 识别优化相关指令

- **WHEN** 用户指令包含以下关键词：
  - "优化"、"改进"、"提升"、"改善"、"美化"
- **AND** 不包含明确的属性关键词
- **THEN** 系统判断该指令为模糊指令

#### Scenario: 识别英文模糊指令

- **WHEN** 用户指令包含以下关键词：
  - "modern"、"elegant"、"minimal"、"consistent"、"prominent"
- **THEN** 系统判断该指令为模糊指令

### Requirement: 混合指令处理

系统 SHALL 能够正确处理同时包含明确和模糊关键词的指令。

#### Scenario: 明确关键词优先

- **WHEN** 用户指令同时包含明确属性关键词和模糊目标关键词
- **AND** 明确关键词指定了要修改的属性
- **THEN** 系统判断该指令为明确指令
- **AND** 不触发深度样式分析

**示例**：
- "把颜色调得更现代" → 明确指令（有"颜色"）
- "让字体更优雅" → 明确指令（有"字体"）

#### Scenario: 纯模糊指令

- **WHEN** 用户指令只包含模糊关键词，没有明确属性关键词
- **THEN** 系统判断该指令为模糊指令
- **AND** 触发深度样式分析

**示例**：
- "让这个更现代" → 模糊指令
- "优化一下样式" → 模糊指令

### Requirement: 检测算法实现

系统 SHALL 使用关键词匹配算法实现模糊度检测。

#### Scenario: 不区分大小写匹配

- **WHEN** 系统分析用户指令
- **THEN** 将指令转换为小写后再进行关键词匹配
- **AND** 支持中英文混合的指令

#### Scenario: 返回布尔值

- **WHEN** isFuzzyPrompt 方法被调用
- **THEN** 它返回 true 表示模糊指令
- **AND** 返回 false 表示明确指令

#### Scenario: 性能要求

- **WHEN** 系统执行模糊度检测
- **THEN** 检测时间 SHALL 小于 1ms
- **AND** 不阻塞主线程

### Requirement: 可扩展的关键词列表

系统 SHALL 使用可配置的关键词列表，便于后续扩展和调整。

#### Scenario: 关键词列表定义

- **WHEN** 模糊度检测功能被初始化
- **THEN** 系统维护以下关键词列表：
  - SPECIFIC_KEYWORDS：明确属性关键词数组
  - FUZZY_KEYWORDS：模糊目标关键词数组
- **AND** 关键词列表易于添加新条目

#### Scenario: 支持多语言

- **WHEN** 关键词列表被定义
- **THEN** 它同时包含中文和英文关键词
- **AND** 可以根据需要添加其他语言

### Requirement: 检测结果的使用

系统 SHALL 根据模糊度检测结果选择不同的上下文提取策略。

#### Scenario: 明确指令的上下文提取

- **WHEN** isFuzzyPrompt 返回 false
- **THEN** extractElementInfo 被调用时：
  - includeParent = false
  - includeSiblings = false
  - includeDesignSystem = false
- **AND** 只提取目标元素的基础样式信息

#### Scenario: 模糊指令的上下文提取

- **WHEN** isFuzzyPrompt 返回 true
- **THEN** extractElementInfo 被调用时：
  - includeParent = true
  - includeSiblings = true
  - includeDesignSystem = true
- **AND** 提取完整的样式上下文信息

### Requirement: 日志和调试

系统 SHALL 记录模糊度检测结果，便于调试和优化。

#### Scenario: 记录检测结果

- **WHEN** 用户提交 AI 修改指令
- **THEN** 系统在控制台输出：
  - 原始用户指令
  - 模糊度检测结果（true/false）
  - 是否触发深度分析

**示例输出**：
```
[ElementPicker] AI Prompt: 让这个按钮更现代
[ElementPicker] 是否需要深度分析: true
```

### Requirement: 边界情况处理

系统 SHALL 能够正确处理各种边界情况和异常输入。

#### Scenario: 空字符串处理

- **WHEN** 用户指令为空字符串
- **THEN** 系统判断为明确指令（或阻止提交）

#### Scenario: 特殊字符处理

- **WHEN** 用户指令包含特殊字符或标点符号
- **THEN** 系统正常进行关键词匹配
- **AND** 不受特殊字符影响

#### Scenario: 超长指令处理

- **WHEN** 用户指令超过 1000 个字符
- **THEN** 系统正常进行关键词匹配
- **AND** 不影响性能
