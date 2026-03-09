# Spec: 设计系统推断

定义设计系统推断能力，负责自动分析并总结页面的设计模式，包括配色、字体、间距、圆角和阴影系统。

## ADDED Requirements

### Requirement: 配色方案分析

系统 SHALL 自动分析页面的配色方案，识别主色调、次要色、背景色、文本色和边框色。

#### Scenario: 提取主色调

- **WHEN** 系统分析页面配色
- **THEN** 它扫描以下元素：
  - 所有 button 元素
  - 所有 [role="button"] 元素
  - 所有 .btn 类元素
  - 所有 a 链接元素
  - 所有 [role="link"] 元素
- **AND** 提取这些元素的 backgroundColor 和 color
- **AND** 去除 rgba(0, 0, 0, 0) 和 transparent
- **AND** 返回最多 5 个主色调

#### Scenario: 提取背景色

- **WHEN** 系统分析页面配色
- **THEN** 它提取：
  - body 元素的 backgroundColor
  - 所有 .card 类元素的 backgroundColor
  - 所有 [class*="card"] 元素的 backgroundColor
- **AND** 返回最多 3 个背景色

#### Scenario: 提取文本色

- **WHEN** 系统分析页面配色
- **THEN** 它提取：
  - body 元素的 color
  - 所有标题元素（h1-h6）的 color
- **AND** 返回最多 5 个文本色

#### Scenario: 提取边框色

- **WHEN** 系统分析页面配色
- **THEN** 它扫描：
  - 所有 input 元素
  - 所有 textarea 元素
  - 所有 select 元素
- **AND** 提取这些元素的 borderColor
- **AND** 去除 rgba(0, 0, 0, 0)
- **AND** 返回最多 3 个边框色

#### Scenario: 颜色去重和规范化

- **WHEN** 系统收集到颜色列表
- **THEN** 它执行以下操作：
  - 将所有颜色值规范化为 rgb/rgba 格式
  - 去除重复的颜色值
  - 限制返回数量（primary/secondary: 5个，background/text: 3-5个，border: 3个）

### Requirement: 字体系统分析

系统 SHALL 自动分析页面的字体系统，识别字体家族、字号规模、字重和行高。

#### Scenario: 提取字体家族

- **WHEN** 系统分析页面字体
- **THEN** 它扫描常见的文本元素：
  - p, span, div, h1-h6, button, a, input
- **AND** 提取这些元素的 fontFamily
- **AND** 去除重复值
- **AND** 返回最多 3 个字体家族

#### Scenario: 提取字号规模

- **WHEN** 系统分析页面字体
- **THEN** 它提取文本元素的 fontSize
- **AND** 转换为数值（去掉 "px" 单位）
- **AND** 去除 NaN 值
- **AND** 按升序排序
- **AND** 返回最多 10 个字号值

#### Scenario: 提取字重规模

- **WHEN** 系统分析页面字体
- **THEN** 它提取文本元素的 fontWeight
- **AND** 转换为整数值（400, 500, 600 等）
- **AND** 去除 NaN 值
- **AND** 按升序排序
- **AND** 返回常见的字重列表

#### Scenario: 提取行高

- **WHEN** 系统分析页面字体
- **THEN** 它提取文本元素的 lineHeight
- **AND** 转换为数值
- **AND** 去除 NaN 和 "normal" 值
- **AND** 返回最多 5 个行高值

### Requirement: 间距系统分析

系统 SHALL 自动分析页面的间距系统，识别常用间距值和基础间距单位。

#### Scenario: 提取常用间距值

- **WHEN** 系统分析页面间距
- **THEN** 它扫描常见的容器元素：
  - div, button, .card, section
- **AND** 提取这些元素的以下属性：
  - paddingTop, paddingRight, paddingBottom, paddingLeft
  - marginTop, marginRight, marginBottom, marginLeft
- **AND** 转换为数值
- **AND** 去除 NaN 和 <= 0 的值
- **AND** 去重并按升序排序
- **AND** 返回最多 10 个常用间距值

#### Scenario: 推断基础间距单位

- **WHEN** 系统获得常用间距值列表
- **THEN** 它尝试找出基础间距单位：
  - 测试常见除数：4, 8, 16
  - 检查所有间距值是否能被某个除数整除
  - 如果某个除数能整除大部分间距值，则认定为基础单位
- **AND** 默认基础单位为 8px
- **AND** 返回推断的基础间距单位

**示例**：
- 间距值：[4, 8, 12, 16, 20, 24]
- 测试 4：所有值都能被 4 整除 → 基础单位 = 4px
- 测试 8：20 不能被 8 整除 → 不选 8

### Requirement: 圆角系统分析

系统 SHALL 自动分析页面的圆角系统，识别常用的圆角值。

#### Scenario: 提取常用圆角值

- **WHEN** 系统分析页面圆角
- **THEN** 它扫描常见的圆角元素：
  - button, .card, input
  - [class*="box"], [class*="card"]
- **AND** 提取这些元素的 borderRadius
- **AND** 转换为数值（处理 "8px" → 8）
- **AND** 去除 NaN 和 <= 0 的值
- **AND** 去重并按升序排序
- **AND** 返回最多 5 个常用圆角值

### Requirement: 阴影系统分析

系统 SHALL 自动分析页面的阴影系统，识别常用的阴影模式。

#### Scenario: 提取阴影模式

- **WHEN** 系统分析页面阴影
- **THEN** 它扫描常见的阴影元素：
  - .card, button
  - [class*="shadow"], [class*="elevated"]
- **AND** 提取这些元素的 boxShadow
- **AND** 过滤掉 "none" 和空值
- **AND** 去重
- **AND** 返回最多 5 个阴影模式字符串

**示例输出**：
```
commonPatterns: [
  "0 1px 3px rgba(0, 0, 0, 0.1)",
  "0 4px 6px rgba(0, 0, 0, 0.1)",
  "0 10px 15px rgba(0, 0, 0, 0.1)"
]
```

### Requirement: 采样策略和性能

系统 SHALL 使用合理的采样策略，在保证准确性的同时控制性能开销。

#### Scenario: 限制采样数量

- **WHEN** 系统扫描页面元素
- **THEN** 它遵循以下限制：
  - 配色分析：扫描所有匹配元素（通常 < 100）
  - 字体分析：扫描前 20 个文本元素
  - 间距分析：扫描前 20 个容器元素
  - 圆角分析：扫描所有匹配元素
  - 阴影分析：扫描所有匹配元素

#### Scenario: 使用高效的选择器

- **WHEN** 系统查找元素
- **THEN** 它使用 querySelectorAll 而非遍历 DOM 树
- **AND** 使用组合选择器（如 "button, .btn, [role='button']"）

#### Scenario: 性能约束

- **WHEN** 系统执行完整的设计系统分析
- **THEN** 分析时间 SHALL 小于 150ms
- **AND** 不阻塞主线程超过 50ms

### Requirement: 数据结构定义

系统 SHALL 使用明确的类型定义设计系统数据结构。

#### Scenario: ColorPalette 类型

- **WHEN** ColorPalette 被定义
- **THEN** 它包含以下字段：
  - primary: string[] - 主色调数组
  - secondary: string[] - 次要色数组
  - background: string[] - 背景色数组
  - text: string[] - 文本色数组
  - border: string[] - 边框色数组

#### Scenario: TypographySystem 类型

- **WHEN** TypographySystem 被定义
- **THEN** 它包含以下字段：
  - fontFamilies: string[] - 字体家族数组
  - fontSizeScale: number[] - 字号数组
  - fontWeightScale: number[] - 字重数组
  - lineHeights: number[] - 行高数组

#### Scenario: SpacingSystem 类型

- **WHEN** SpacingSystem 被定义
- **THEN** 它包含以下字段：
  - commonValues: number[] - 常用间距值数组
  - rhythmUnit: number - 基础间距单位

#### Scenario: BorderRadiusSystem 类型

- **WHEN** BorderRadiusSystem 被定义
- **THEN** 它包含：
  - commonValues: number[] - 常用圆角值数组

#### Scenario: BoxShadowSystem 类型

- **WHEN** BoxShadowSystem 被定义
- **THEN** 它包含：
  - commonPatterns: string[] - 常用阴影模式数组

#### Scenario: PageDesignSystem 类型

- **WHEN** PageDesignSystem 被定义
- **THEN** 它包含以下字段：
  - colorPalette: ColorPalette
  - typography: TypographySystem
  - spacing: SpacingSystem
  - borderRadius: BorderRadiusSystem
  - boxShadow: BoxShadowSystem

### Requirement: 容错处理

系统 SHALL 能够优雅地处理各种异常情况。

#### Scenario: 处理缺失元素

- **WHEN** 页面不存在某种类型的元素（如没有 button）
- **THEN** 相应的分析结果为空数组
- **AND** 不抛出错误

#### Scenario: 处理无效样式值

- **WHEN** 元素的样式值为无效格式
- **THEN** 系统跳过该值
- **AND** 继续处理其他有效值

#### Scenario: 处理动态样式

- **WHEN** 样式通过 JavaScript 动态修改
- **THEN** 系统获取的是当前计算样式
- **AND** 反映的是分析时的快照状态

### Requirement: 可选的缓存机制

系统 SHOULD 支持设计系统分析结果的缓存，避免重复分析。

#### Scenario: 页面级缓存

- **WHEN** 用户在同一页面的不同元素上触发模糊指令
- **THEN** 系统可以复用之前的设计系统分析结果
- **AND** 缓存基于页面 URL 进行识别

#### Scenario: 缓存失效

- **WHEN** 用户导航到新页面
- **OR** 页面发生重大 DOM 变化
- **THEN** 系统清除缓存
- **AND** 下次分析时重新计算
