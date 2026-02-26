# 浏览器扩展架构规格

## 概述

本项目是一个基于 React 19 + TypeScript + Vite 的跨浏览器扩展,支持 Chrome、Firefox、Opera、Edge 等主流浏览器。使用 Manifest V3 规范,实现"一次编写,多浏览器运行"的目标。

## 技术栈

- **Bundler**: Vite 7
- **UI框架**: React 19 (自动 JSX runtime)
- **语言**: TypeScript 5.9
- **样式**: SCSS + CSS Modules
- **代码规范**: ESLint 9 (flat config) + Prettier
- **构建工具**: vite-plugin-wext-manifest (跨浏览器manifest生成)
- **浏览器API**: webextension-polyfill

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器扩展架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Popup      │◄────►│   Content    │  (通过 tabs API)    │
│  │   (弹窗UI)    │      │   Script     │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         │ runtime.sendMessage │                             │
│         ▼                     ▼                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Background  │◄─────│  Content     │                     │
│  │  (后台脚本)   │      │  Script      │  (页面访问通知)      │
│  └──────┬───────┘      └──────────────┘                    │
│         │                                                    │
│         │ browser.storage.local                             │
│         ▼                                                    │
│  ┌──────────────┐                                          │
│  │   Storage    │  (持久化数据存储)                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. Background Script (后台脚本)

**职责**: 扩展的"中央大脑",负责全局状态管理和消息路由

**功能**:
- 监听扩展安装/更新事件 (`browser.runtime.onInstalled`)
- 处理来自 Content Script 和 Popup 的消息
- 管理全局状态(如访问计数、用户配置)
- 持久化数据到 `browser.storage.local`

**通信方式**:
- 接收: `browser.runtime.onMessage`
- 发送: `browser.runtime.sendMessage`

**打包格式**:
- Chrome: Service Worker (ES Module)
- Firefox: Background Script (ES Module)

**实现位置**: `source/Background/index.ts`

---

### 2. Content Script (内容脚本)

**职责**: 注入到网页中,操作页面DOM并收集信息

**功能**:
- 页面加载时收集页面信息(标题、URL、字数、链接数、图片数等)
- 页面加载完成时通知 Background Script
- 响应 Popup 的查询请求,返回当前页面信息

**通信方式**:
- 发送到Background: `browser.runtime.sendMessage`
- 接收Popup: `browser.runtime.onMessage`
- 发送到Popup: `browser.tabs.sendMessage` (需要tabId)

**打包格式**: **IIFE** (立即执行函数,不支持ES Module)

**为什么使用IIFE**: 浏览器的content script执行环境不支持ES Module,必须打包为自包含的IIFE。

**实现位置**: `source/ContentScript/index.ts`

---

### 3. Popup (弹出窗口)

**职责**: 用户交互主界面,展示扩展功能和数据

**功能**:
- 显示当前标签页信息
- 展示页面统计数据(从Content Script获取)
- 显示总访问量(从Background获取)
- 提供快捷操作(刷新、设置、外部链接)
- 读取用户配置(从Storage)

**通信方式**:
- 到Content Script: `browser.tabs.sendMessage(tabId, message)`
- 到Background: `browser.runtime.sendMessage(message)`
- 到Storage: `browser.storage.local.get(keys)`

**生命周期**: 失去焦点时自动关闭,不应依赖Popup保持状态

**实现位置**: `source/Popup/`

---

### 4. Options (选项页面)

**职责**: 用户设置界面,配置扩展行为

**功能**:
- 配置用户名
- 开关调试日志
- 持久化设置到Storage

**通信方式**: 直接使用 `browser.storage.local` API

**实现位置**: `source/Options/`

---

### 5. Storage (存储层)

**职责**: 持久化数据存储

**API**: `browser.storage.local`

**类型安全**: 通过 TypeScript 接口定义存储结构:
```typescript
export interface StorageSchema {
  username: string;
  enableLogging: boolean;
  visitCount: number;
}

export const defaultStorage: StorageSchema = {
  username: '',
  enableLogging: false,
  visitCount: 0,
};
```

**工具函数**: `source/utils/storage.ts`
- `getStorage<K>(keys: K[]): Promise<Pick<StorageSchema, K>>`
- `setStorage<K>(items: Pick<StorageSchema, K>): Promise<void>`
- `getAllStorage(): Promise<StorageSchema>`

---

## 消息通信架构

### 消息类型定义

所有消息类型在 `source/types/messages.ts` 中定义,确保类型安全:

```typescript
export type ExtensionMessage =
  | GetPageInfoMessage          // Popup → Content Script
  | PageInfoResponseMessage     // Content Script → Popup
  | PageVisitedMessage          // Content Script → Background
  | GetVisitCountMessage        // Popup → Background
  | VisitCountResponseMessage;  // Background → Popup
```

### 消息流程

```
┌─────────────────────────────────────────────────────────────┐
│                    消息通信流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  页面加载流程:                                               │
│  ────────────────────────────────────────────────────       │
│  Content Script → PAGE_VISITED → Background                 │
│                           ↓                                  │
│                     更新 visitCount                          │
│                           ↓                                  │
│                     browser.storage.local                   │
│                                                             │
│  Popup 打开流程:                                             │
│  ────────────────────────────────────────────────────       │
│                                                             │
│  1. Popup → GET_PAGE_INFO → Content Script                  │
│     Popup ← PAGE_INFO_RESPONSE ← Content Script             │
│     (获取当前页面统计数据)                                    │
│                                                             │
│  2. Popup → GET_VISIT_COUNT → Background                    │
│     Popup ← VISIT_COUNT_RESPONSE ← Background               │
│     (获取总访问量)                                           │
│                                                             │
│  3. Popup → browser.storage.local.get(['username'])         │
│     ← 读取用户配置                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 消息处理模式

**发送方**:
```typescript
browser.runtime.sendMessage({
  type: 'PAGE_VISITED',
  data: pageInfo
});
```

**接收方**:
```typescript
browser.runtime.onMessage.addListener((message) => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'PAGE_VISITED') {
    // TypeScript 自动推断 msg 类型为 PageVisitedMessage
    const {url, title} = msg.data;
  }

  return Promise.resolve(...);
});
```

---

## 跨浏览器兼容性

### Manifest V3 实现

**Chrome**:
- 使用 `service_worker` 作为后台脚本
- 支持 ES Module
- 最低版本: Chrome 88+

**Firefox**:
- 使用 `scripts` 数组 + `type: module`
- 支持 ES Module (Firefox 112+)
- 需要特定的 `browser_specific_settings`

**配置示例** (`source/manifest.json`):
```json
{
  "background": {
    "__chrome__service_worker": "assets/js/background.bundle.js",
    "__chrome__type": "module",
    "__firefox__scripts": ["assets/js/background.bundle.js"],
    "__firefox__type": "module"
  }
}
```

### 浏览器特定配置

使用 vendor 前缀生成浏览器特定配置:

```json
{
  "__chrome__name": "Chrome扩展名称",
  "__firefox__name": "Firefox附加组件名称",
  "__chrome|firefox__description": "通用描述"
}
```

构建时 `vite-plugin-wext-manifest` 会根据 `TARGET_BROWSER` 环境变量生成对应的 manifest.json。

---

## 构建系统

### Vite 配置要点

**入口定义** (`vite.config.ts`):
```typescript
rollupOptions: {
  input: {
    // UI页面: 使用HTML文件作为入口
    popup: path.resolve(sourcePath, 'Popup/popup.html'),
    options: path.resolve(sourcePath, 'Options/options.html'),

    // 后台脚本: 直接使用TS文件
    background: path.resolve(sourcePath, 'Background/index.ts'),

    // Content Script: 单独构建为IIFE
    // (通过 buildIIFEScripts 插件处理)
  }
}
```

**Content Script 的 IIFE 构建**:
```typescript
buildIIFEScripts({
  scripts: [{
    name: 'contentScript',
    entry: path.resolve(sourcePath, 'ContentScript/index.ts'),
  }],
  outDir: getOutDir(),
  isDevelopment,
})
```

**输出结构**:
```
extension/
├── chrome/
│   ├── manifest.json
│   ├── Popup/
│   ├── Options/
│   └── assets/
│       ├── js/
│       │   ├── popup.bundle.js
│       │   ├── options.bundle.js
│       │   ├── background.bundle.js
│       │   └── contentScript.bundle.js (IIFE)
│       └── css/
└── firefox/
    └── (同上)
```

### 开发工作流

```bash
# 开发模式 (文件变化时自动重建)
npm run dev:chrome    # Chrome 开发
npm run dev:firefox   # Firefox 开发

# 生产构建
npm run build:chrome  # 构建 Chrome 扩展
npm run build:firefox # 构建 Firefox 附加组件
npm run build         # 构建所有浏览器

# 代码检查
npm run lint          # ESLint 检查
npm run lint:fix      # 自动修复
```

**开发流程**:
1. 启动开发服务器: `npm run dev:chrome`
2. 在浏览器中加载扩展:
   - Chrome: `chrome://extensions` → "加载已解压的扩展程序" → 选择 `extension/chrome`
   - Firefox: `about:debugging` → "此Firefox" → "加载临时附加组件" → 选择 `extension/firefox/manifest.json`
3. 修改 `source/` 目录代码
4. Vite 自动监听变化并重新构建到 `extension/<browser>/`
5. 在 `chrome://extensions` 点击刷新按钮
6. 测试功能

---

## 目录结构

```
source/
├── Background/                  # 后台脚本
│   └── index.ts
│
├── ContentScript/              # 内容脚本 (IIFE)
│   └── index.ts
│
├── Popup/                      # 弹出窗口
│   ├── popup.html              # HTML入口
│   ├── index.tsx               # React入口
│   ├── Popup.tsx               # 主组件
│   ├── Popup.module.scss       # 样式
│   └── components/             # Popup专用组件
│       ├── TabInfo/
│       └── FooterActions/
│
├── Options/                    # 选项页面
│   ├── options.html
│   ├── index.tsx
│   ├── Options.tsx
│   └── Options.module.scss
│
├── components/                 # 共享React组件
│   ├── Button/
│   ├── Card/
│   ├── Input/
│   ├── Checkbox/
│   └── icons/
│
├── types/                      # TypeScript类型定义
│   ├── messages.ts             # 消息通信类型
│   └── storage.ts              # 存储数据结构
│
├── utils/                      # 工具函数
│   └── storage.ts              # 存储操作封装
│
├── styles/                     # 全局样式
│   ├── _variables.scss         # SCSS变量
│   ├── _reset.scss             # CSS重置
│   └── _fonts.scss             # 字体定义
│
├── public/                     # 静态资源
│   └── assets/
│       └── icons/              # 扩展图标
│
├── manifest.json               # 扩展清单模板
└── globals.d.ts                # 全局类型声明
```

---

## 调试技巧

### Background Script 调试
- **Chrome**: `chrome://extensions` → "Service Worker" → "inspect"
- **Firefox**: `about:debugging` → 点击 "Inspect"

### Content Script 调试
- 在任意网页按 F12 打开开发者工具
- Console 中查看日志

### Popup 调试
- 右键扩展图标 → "检查弹出内容"
- 或者打开Popup后按F12

### 条件日志
```typescript
getStorage(['enableLogging']).then(({enableLogging}) => {
  if (enableLogging) {
    console.log('[Extension]', data);
  }
});
```

---

## 安全考虑

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### 权限最小化
- 只申请必要的权限
- 使用 `optional_permissions` 延迟请求权限
- 使用 `activeTab` 而不是 `<all_urls>`

### 数据验证
- 所有消息通信使用类型保护
- 存储操作使用类型化的 Schema
- 输入数据在 Content Script 中验证

---

## 性能优化

### Content Script 优化
- 使用 IIFE 避免全局作用域污染
- 延迟非关键操作
- 使用 `document_idle` 或 `document_end` 而不是 `document_start` (除非必要)

### Background Script 优化
- Chrome Service Worker 可能被挂起,不要依赖持久状态
- 使用 `chrome.storage.local` 而不是内存变量

### 构建优化
- 生产环境自动移除 console 和 debugger
- 代码压缩和混淆
- CSS 提取和压缩

---

## 已知限制

### Content Script 限制
- ❌ 不能使用 ES Module (必须打包为 IIFE)
- ❌ 无法访问扩展的全局 `window` 对象
- ❌ 无法直接调用 Background Script 的函数(只能通过消息)
- ✅ 可以访问页面的 DOM 和 `window` 对象

### Background Script 限制
- ❌ 无法直接访问页面 DOM
- ❌ Chrome Service Worker 可能被挂起
- ✅ 可以使用所有 Extension API

### Popup 限制
- ❌ 失去焦点时自动关闭
- ❌ 尺寸有限(建议宽度 380px)
- ✅ 可以调用所有 Extension API

---

## 参考资料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtension Polyfill](https://github.com/mozilla/webextension-polyfill)
- [vite-plugin-wext-manifest](https://github.com/abhijithvijayan/vite-plugin-wext-manifest)
