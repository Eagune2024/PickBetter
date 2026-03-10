## Why

PickBetter 目前支持用户通过 AI 修改网页元素,但用户无法保存修改后的页面。当用户关闭浏览器或刷新页面后,所有修改都会丢失。添加页面保存功能可以让用户将修改后的网页永久保存为单个 HTML 文件,方便离线查看、分享或归档。

## What Changes

- 在 AI 修改完成后的对话框中添加"保存页面"按钮
- 实现完整的页面序列化功能,包括:
  - DOM 树克隆和序列化
  - CSS 样式提取和内联化
  - 图片资源转换为 Base64
  - 外部 CSS 文件获取和内联
  - Shadow DOM、iframe、Canvas 等高级元素处理
- 生成自包含的单个 HTML 文件并触发下载
- 添加进度提示,提升大页面保存时的用户体验

## Capabilities

### New Capabilities
- `page-saver`: 将当前网页状态保存为单个自包含的 HTML 文件的能力,包括 DOM、CSS、图片等所有资源的序列化和内联化

### Modified Capabilities
- 无现有功能的需求变更,仅扩展 AI 元素修改后的操作选项

## Impact

**受影响的代码模块:**
- `source/ContentScript/elementPicker/aiDialogManager.ts`: 在成功对话框中添加保存按钮
- `source/utils/`: 新增 `pageSaver/` 目录,包含页面保存的核心逻辑
- `source/types/`: 可能需要添加页面保存相关的类型定义
- `source/types/messages.ts`: 可能需要添加保存进度相关的消息类型(如果需要与 Background 通信)

**新增依赖:**
- 无需新增外部依赖,使用浏览器原生 API (fetch, FileReader, Blob 等)

**性能考虑:**
- 大页面处理可能需要几秒钟,需要实现进度提示
- 图片转换为 Base64 可能增加内存使用,需要实现资源去重和缓存

**兼容性:**
- 功能在 Chrome 和 Firefox 上均可实现
- CORS 限制可能影响某些外部资源的获取,需要优雅降级处理
