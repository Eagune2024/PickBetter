# Page Saver Capability Specification

## ADDED Requirements

### Requirement: DOM 序列化

系统 MUST 能够克隆当前文档的 DOM 树,包括所有元素、属性和文本内容,创建一个独立的文档副本用于序列化。

#### Scenario: 成功克隆 DOM 树

- **WHEN** 用户点击"保存页面"按钮
- **THEN** 系统必须创建当前 document 的完整克隆
- **AND** 克隆必须包含所有元素、属性和文本节点
- **AND** 克隆必须独立于原始 DOM,后续修改不影响克隆

#### Scenario: 处理 Shadow DOM

- **WHEN** 页面包含 Shadow DOM 元素
- **THEN** 系统必须序列化 Shadow Root 的内容
- **AND** 将序列化后的内容插入到 host 元素内
- **AND** 保留 Shadow DOM 的结构和样式

#### Scenario: 处理 Canvas 元素

- **WHEN** 页面包含 Canvas 元素
- **THEN** 系统必须将 Canvas 转换为图片
- **AND** 使用 `toDataURL()` 方法获取图片的 Base64 编码
- **AND** 用 `<img>` 标签替换原始 Canvas 元素

### Requirement: CSS 内联化

系统 MUST 能够提取并内联所有 CSS 样式,将外部样式表和内部样式合并为单个 `<style>` 标签。

#### Scenario: 提取内部样式

- **WHEN** 页面包含 `<style>` 标签
- **THEN** 系统必须提取所有 `<style>` 标签的内容
- **AND** 合并所有 CSS 规则到单个 `<style>` 标签

#### Scenario: 获取外部样式表

- **WHEN** 页面包含外部 CSS 文件(通过 `<link rel="stylesheet">`)
- **THEN** 系统必须使用 fetch API 获取 CSS 文件内容
- **AND** 将获取的 CSS 添加到合并后的样式中

#### Scenario: 处理 CSS 中的相对 URL

- **WHEN** CSS 包含相对 URL(如 `url(../images/bg.png)`)
- **THEN** 系统必须将相对 URL 转换为绝对 URL
- **AND** 使用当前页面的 URL 作为基础 URL 解析相对路径

#### Scenario: 处理 @import 规则

- **WHEN** CSS 包含 `@import` 规则
- **THEN** 系统必须获取导入的 CSS 文件内容
- **AND** 将导入的 CSS 内联到主样式中
- **AND** 移除原始的 `@import` 规则

#### Scenario: 处理 CSS 变量

- **WHEN** CSS 包含自定义属性(如 `--color: red`)
- **THEN** 系统必须保留 CSS 变量定义
- **AND** 正确处理 `var(--color)` 引用

### Requirement: 图片转换

系统 MUST 能够将所有外部图片资源转换为 Base64 编码的 data URI,嵌入到 HTML 文件中。

#### Scenario: 转换 img 标签图片

- **WHEN** 页面包含 `<img src="...">` 标签
- **THEN** 系统必须使用 fetch API 获取图片内容
- **AND** 使用 FileReader 将图片转换为 Base64
- **AND** 将 `src` 属性替换为 `data:image/...;base64,...` 格式

#### Scenario: 处理懒加载图片

- **WHEN** 图片使用懒加载(如 `data-src` 属性)
- **THEN** 系统必须优先使用 `data-src` 属性的值
- **AND** 如果 `data-src` 不存在,则使用 `src` 属性

#### Scenario: 转换 CSS 背景图

- **WHEN** 元素样式包含 `background-image` 属性
- **THEN** 系统必须提取 `url()` 中的图片 URL
- **AND** 将图片转换为 Base64
- **AND** 替换 CSS 中的原始 URL

#### Scenario: 处理 srcset 属性

- **WHEN** `<img>` 标签包含 `srcset` 属性
- **THEN** 系统必须处理 `srcset` 中的所有图片 URL
- **AND** 将每个 URL 转换为 Base64
- **AND** 保持原始的宽屏描述符(如 `1x`, `2x`)

#### Scenario: 处理 picture 元素

- **WHEN** 页面包含 `<picture>` 元素
- **THEN** 系统必须处理所有 `<source>` 元素的 `srcset` 属性
- **AND** 处理 `<img>` 元素的 `src` 和 `srcset`

#### Scenario: 资源去重

- **WHEN** 多个元素引用相同的图片
- **THEN** 系统必须只转换一次图片
- **AND** 使用 Base64 内容的 hash 作为缓存 key
- **AND** 所有引用使用相同的 Base64 数据

### Requirement: 字体处理(可选)

系统 SHOULD 能够处理 Web 字体,将外部字体文件转换为 Base64 并嵌入到 CSS 中。

#### Scenario: 处理 @font-face 规则

- **WHEN** CSS 包含 `@font-face` 规则
- **THEN** 系统必须获取字体文件内容
- **AND** 将字体转换为 Base64
- **AND** 使用 data URI 替换 `url()` 中的字体 URL

#### Scenario: 处理 CORS 字体限制

- **WHEN** 字体文件存在 CORS 限制无法获取
- **THEN** 系统必须记录警告日志
- **AND** 跳过该字体,继续处理其他资源
- **AND** 不中断整个保存流程

### Requirement: iframe 处理(可选)

系统 SHOULD 能够处理同源 iframe,序列化其内容;对跨源 iframe 保留原始引用。

#### Scenario: 处理同源 iframe

- **WHEN** iframe 与主页面同源
- **THEN** 系统必须序列化 iframe 的文档内容
- **AND** 将序列化后的 HTML 嵌入到主文档中

#### Scenario: 处理跨源 iframe

- **WHEN** iframe 与主页面不同源
- **THEN** 系统必须保留 iframe 的原始 `src` 属性
- **AND** 不尝试序列化 iframe 内容(受 CORS 限制)

### Requirement: HTML 生成和下载

系统 MUST 能够生成完整的自包含 HTML 文件并触发浏览器下载。

#### Scenario: 生成 HTML 文档

- **WHEN** 所有资源处理完成
- **THEN** 系统必须生成包含 `<!DOCTYPE html>` 的完整 HTML
- **AND** 添加元数据标记(如保存来源 URL、保存时间)

#### Scenario: 触发文件下载

- **WHEN** HTML 文档生成完成
- **THEN** 系统必须创建 Blob 对象
- **AND** 生成临时 URL(使用 `URL.createObjectURL()`)
- **AND** 创建 `<a>` 标签并触发点击下载
- **AND** 下载完成后释放临时 URL

#### Scenario: 文件命名规则

- **WHEN** 生成下载文件名
- **THEN** 系统必须使用格式"页面标题-时间戳.html"
- **AND** 移除文件名中的非法字符
- **AND** 确保文件名唯一性(通过时间戳)

### Requirement: 进度反馈

系统 MUST 在保存过程中提供实时进度反馈,显示当前处理阶段和进度百分比。

#### Scenario: 显示保存进度

- **WHEN** 用户点击"保存页面"按钮
- **THEN** 系统必须在 AI 对话框中显示进度指示器
- **AND** 显示当前处理阶段(如"正在处理 CSS...")
- **AND** 更新进度百分比

#### Scenario: 完成后显示成功消息

- **WHEN** 保存流程成功完成
- **THEN** 系统必须显示"保存成功"消息
- **AND** "保存页面"按钮变为不可用状态
- **AND** 提供打开已保存文件的选项(可选)

#### Scenario: 处理保存失败

- **WHEN** 保存流程出现错误
- **THEN** 系统必须显示"保存失败"消息
- **AND** 显示错误原因(如"无法加载外部 CSS")
- **AND** 记录详细错误信息到控制台

### Requirement: CORS 限制处理

系统 MUST 优雅处理 CORS 限制,对无法获取的资源记录警告但不中断流程。

#### Scenario: 处理 CORS 失败

- **WHEN** fetch 请求因 CORS 限制失败
- **THEN** 系统必须捕获错误并记录警告日志
- **AND** 跳过该资源,继续处理其他资源
- **AND** 不显示错误提示给用户(仅 console 记录)

#### Scenario: 处理网络错误

- **WHEN** fetch 请求因网络问题失败
- **THEN** 系统必须记录错误日志
- **AND** 跳过该资源,继续处理其他资源
- **AND** 在最终保存的 HTML 中添加注释标注缺失资源

### Requirement: 性能优化

系统 MUST 实现资源缓存和分批处理,优化大页面的保存性能。

#### Scenario: 资源缓存

- **WHEN** 多个元素引用相同的外部资源
- **THEN** 系统必须只下载一次资源
- **AND** 缓存资源内容供后续引用使用

#### Scenario: 分批处理图片

- **WHEN** 页面包含大量图片(> 50 张)
- **THEN** 系统必须分批处理图片(每批 10 张)
- **AND** 每批处理后更新进度指示器
- **AND** 避免阻塞主线程导致界面卡顿

#### Scenario: 设置超时机制

- **WHEN** 资源获取时间超过 30 秒
- **THEN** 系统必须中止当前请求
- **AND** 跳过该资源,继续处理其他资源
- **AND** 记录超时错误日志

### Requirement: UI 集成

系统 MUST 在 AI 修改成功后显示"保存页面"按钮,提供直观的用户交互。

#### Scenario: 显示保存按钮

- **WHEN** AI 修改操作成功完成
- **THEN** 系统必须在成功对话框中显示"保存页面"按钮
- **AND** 按钮样式与现有 UI 一致
- **AND** 按钮位置在成功消息下方

#### Scenario: 按钮交互状态

- **WHEN** 用户点击"保存页面"按钮
- **THEN** 按钮必须立即变为禁用状态
- **AND** 按钮文本变为"保存中..."
- **AND** 保存完成后显示"已保存"

#### Scenario: 可取消保存操作(可选)

- **WHEN** 保存过程正在进行
- **THEN** 系统可以提供"取消"按钮
- **AND** 点击取消后中止当前保存流程
- **AND** 恢复"保存页面"按钮到初始状态
