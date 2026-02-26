# 快速参考指南

本文档提供了日常开发中最常用的操作和模式,作为快速参考手册。

## 快速开始

### 开发模式

```bash
# Chrome 开发
npm run dev:chrome
# 加载扩展: chrome://extensions → "加载已解压的扩展程序" → 选择 extension/chrome

# Firefox 开发
npm run dev:firefox
# 加载扩展: about:debugging → "此 Firefox" → "加载临时附加组件" → 选择 extension/firefox/manifest.json
```

### 生产构建

```bash
npm run build:chrome   # 构建 Chrome 扩展
npm run build:firefox  # 构建 Firefox 附加组件
npm run build          # 构建所有浏览器
```

### 代码检查

```bash
npm run lint           # 检查代码
npm run lint:fix       # 自动修复问题
```

---

## 常用模式

### 1. 创建新组件

```
source/components/YourComponent/
├── YourComponent.tsx
├── YourComponent.module.scss
└── index.ts (可选)
```

```typescript
// YourComponent.tsx
import type {FC, ReactNode} from 'react';
import styles from './YourComponent.module.scss';

interface YourComponentProps {
  title: string;
  children?: ReactNode;
}

export const YourComponent: FC<YourComponentProps> = ({ title, children }) => {
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};
```

```scss
// YourComponent.module.scss
@use "../../styles/variables";

.container {
  padding: 16px;
  background: variables.$white;
  border-radius: variables.$radiusMd;
}
```

### 2. 添加新消息类型

```typescript
// source/types/messages.ts

// 1. 定义消息接口
export interface YourMessage {
  type: 'YOUR_MESSAGE';
  data: {
    // 你的数据结构
  };
}

// 2. 添加到联合类型
export type ExtensionMessage =
  | ...existing messages
  | YourMessage;
```

**发送消息**:
```typescript
browser.runtime.sendMessage({
  type: 'YOUR_MESSAGE',
  data: {...},
});
```

**接收消息**:
```typescript
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'YOUR_MESSAGE') {
    // 处理消息
    // TypeScript 自动推断 msg 类型为 YourMessage
  }

  return Promise.resolve();
});
```

### 3. 添加存储字段

```typescript
// source/types/storage.ts

export interface StorageSchema {
  // ...现有字段
  yourNewField: boolean;
}

export const defaultStorage: StorageSchema = {
  // ...现有默认值
  yourNewField: false,
};
```

**使用**:
```typescript
// 读取
const {yourNewField} = await getStorage(['yourNewField']);

// 写入
await setStorage({yourNewField: true});
```

### 4. 创建新的 Popup/Options 页面

```
source/NewPage/
├── newpage.html
├── index.tsx
├── NewPage.tsx
└── NewPage.module.scss
```

**HTML 入口**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Page</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

**React 入口**:
```typescript
// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import NewPage from './NewPage';
import './styles/fonts';
import './styles/reset';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<NewPage />);
```

**Vite 配置**:
```typescript
// vite.config.ts
rollupOptions: {
  input: {
    // ...其他入口
    newpage: path.resolve(sourcePath, 'NewPage/newpage.html'),
  }
}
```

---

## 常见任务

### 修改扩展图标

1. 准备图标文件 (16x16, 32x32, 48x48, 128x128)
2. 放到 `source/public/assets/icons/`
3. 更新 `source/manifest.json`:
   ```json
   {
     "icons": {
       "16": "assets/icons/favicon-16.png",
       "32": "assets/icons/favicon-32.png",
       "48": "assets/icons/favicon-48.png",
       "128": "assets/icons/favicon-128.png"
     }
   }
   ```

### 添加新权限

编辑 `source/manifest.json`:
```json
{
  "permissions": ["activeTab", "storage", "tabs"],
  "host_permissions": ["https://api.example.com/*"],
  "optional_permissions": ["<all_urls>"]
}
```

### 跨域请求

```typescript
// 在 Background Script 中
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

**注意**: 需要在 `manifest.json` 中添加 `host_permissions`

### 调试技巧

**Background Script**:
- Chrome: `chrome://extensions` → "Service Worker" → "inspect"
- Firefox: `about:debugging` → "Inspect"

**Content Script**:
- 在任意网页按 F12 打开开发者工具

**Popup**:
- 右键扩展图标 → "检查弹出内容"

**条件日志**:
```typescript
getStorage(['enableLogging']).then(({enableLogging}) => {
  if (enableLogging) {
    console.log('[Extension]', data);
  }
});
```

---

## 标准代码模板

### React 组件

```typescript
import type {FC, ReactNode} from 'react';
import {useEffect, useState} from 'react';
import styles from './Component.module.scss';

interface ComponentProps {
  title: string;
  onSave?: (data: string) => void;
}

export const Component: FC<ComponentProps> = ({ title, onSave }) => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    // 初始化逻辑
  }, []);

  const handleClick = (): void => {
    onSave?.(data);
  };

  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      <button onClick={handleClick}>Save</button>
    </div>
  );
};
```

### 消息监听器

```typescript
import browser from 'webextension-polyfill';
import type {ExtensionMessage} from '../types/messages';

browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;

  switch (msg.type) {
    case 'MESSAGE_TYPE_1':
      // 处理消息1
      return Promise.resolve({type: 'RESPONSE_1', data: ...});

    case 'MESSAGE_TYPE_2':
      // 处理消息2
      return Promise.resolve({type: 'RESPONSE_2', data: ...});

    default:
      return Promise.resolve();
  }
});
```

### 存储操作

```typescript
import {getStorage, setStorage} from '../utils/storage';

// 读取
const {username, enableLogging} = await getStorage(['username', 'enableLogging']);

// 写入
await setStorage({
  username: 'John',
  enableLogging: true,
});

// 读取所有
const allData = await getAllStorage();
```

### 异步操作

```typescript
const handleAction = async (): Promise<void> => {
  try {
    // 异步操作
    const result = await someAsyncOperation();

    // 更新状态
    setState(result);

    // 存储数据
    await setStorage({result});
  } catch (error) {
    console.error('Operation failed:', error);
    // 错误处理
  }
};
```

---

## 常见问题

### Q: Content Script 无法注入到某些页面?

**A**: 检查 `manifest.json` 中的 `content_scripts.matches` 是否包含目标页面模式。

### Q: 消息发送失败?

**A**:
1. 检查消息类型是否在 `types/messages.ts` 中定义
2. 确保接收方已注册监听器
3. 检查 `tabId` 是否正确 (Content Script 通信需要)

### Q: 存储数据丢失?

**A**: `browser.storage.local` 是持久化的,但如果用户清除扩展数据会丢失。考虑使用 `chrome.storage.sync` 同步到云端。

### Q: Popup 打开时没有数据?

**A**:
1. 检查是否在 `useEffect` 中正确初始化
2. 确认 Content Script 已注入 (检查 `matches` 配置)
3. Background Script 可能未准备好,使用 `.catch()` 处理错误

### Q: 样式不生效?

**A**:
1. 确认使用了 CSS Modules: `import styles from './Component.module.scss'`
2. 检查类名是否正确: `className={styles.container}`
3. 确认没有全局样式覆盖

---

## 键盘快捷键

### VS Code
- `Cmd+Shift+F`: 全局搜索
- `Cmd+P`: 快速打开文件
- `Cmd+.`: 显示问题
- `Cmd+Shift+.`: 显示输出

### Chrome DevTools
- `Cmd+Option+I`: 打开开发者工具
- `Cmd+Shift+C`: 选择元素
- `Cmd+Option+J`: 切换到 Console

---

## 性能优化建议

### React
- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数

### 浏览器扩展
- 批量存储操作,避免频繁写入
- 使用 `requestAnimationFrame` 优化 DOM 操作
- Content Script 中避免长耗时操作

### 构建
- 生产构建会自动移除 console 和 debugger
- CSS 和 JS 会自动压缩
- 使用 Chrome 的 Lighthouse 检查性能

---

## 相关文档

- [架构规格](../architecture/spec.md)
- [编码规范](../coding-standards/spec.md)
- [Chrome Extension 文档](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
