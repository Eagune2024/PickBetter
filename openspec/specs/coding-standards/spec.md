# 编码规范与最佳实践

本文档定义了 PickBetter 浏览器扩展项目的编码规范、风格指南和最佳实践。

## 项目配置

### 编辑器配置 (.editorconfig)

```ini
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**要求**: 所有编辑器必须遵循此配置

### TypeScript 配置

- **目标**: ESNext
- **模块**: ESNext
- **JSX**: react-jsx (自动导入,无需手动 `import React`)
- **严格模式**: 启用 (通过 `@abhijithvijayan/tsconfig`)
- **模块解析**: bundler (Vite处理)

### ESLint 配置

使用共享配置: `@abhijithvijayan/eslint-config`

**关键规则**:
```javascript
{
  'no-console': 'off',                    // 扩展开发需要调试
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-use-before-define': 'warn',
  'import-x/no-duplicates': 'off',        // ESM resolver问题
  'react/jsx-props-no-spreading': 'off',
  'react/react-in-jsx-scope': 'off',      // React 19自动导入
}
```

**运行检查**:
```bash
npm run lint        # 检查
npm run lint:fix    # 自动修复
```

---

## TypeScript 规范

### 类型定义

#### 1. 使用 interface 定义对象类型

```typescript
// ✅ 推荐
interface TabInfoProps {
  title: string;
  url: string;
  onReload: () => void;
}

// ❌ 避免 (复杂对象类型)
type TabInfoProps = {
  title: string;
  url: string;
  onReload: () => void;
};
```

#### 2. 使用 type 定义联合类型

```typescript
// ✅ 推荐
type ButtonVariant = 'primary' | 'secondary' | 'settings';
type Message = TypeA | TypeB | TypeC;

// ❌ 避免 (interface无法表示联合)
interface ButtonVariant extends 'primary' | 'secondary' | 'settings' {}
```

#### 3. 函数组件使用 FC 类型

```typescript
// ✅ 推荐
import type {FC} from 'react';

export const Button: FC<ButtonProps> = ({ children, ...props }) => {
  return <button {...props}>{children}</button>;
};

// ✅ 也可以 (对于简单组件)
const Button = ({ children }: ButtonProps) => {
  return <button>{children}</button>;
};
```

#### 4. 显式声明函数返回类型

```typescript
// ✅ 推荐
const handleSave = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  await setStorage({username});
};

const getPageInfo = (): PageInfo => {
  return {
    url: window.location.href,
    title: document.title,
  };
};

// ❌ 避免 (除非函数非常简单)
const handleSave = async (e: React.FormEvent) => {
  // ...
};
```

### 类型守卫与类型断言

#### 1. 消息类型断言

```typescript
// ✅ 推荐: 使用类型断言 + 类型检查
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'GET_PAGE_INFO') {
    // TypeScript 自动推断 msg 类型为 GetPageInfoMessage
    return Promise.resolve({type: 'PAGE_INFO_RESPONSE', data});
  }
});
```

#### 2. DOM 元素类型守卫

```typescript
// ✅ 推荐
const element = document.getElementById('root');
if (element) {
  // TypeScript 知道 element 不为 null
  element.innerHTML = '...';
}
```

### 泛型使用

#### 1. 存储操作的泛型约束

```typescript
// ✅ 推荐: 使用 keyof 约束
export async function getStorage<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  const result = await browser.storage.local.get(keys);
  return result as Pick<StorageSchema, K>;
}

// 使用时类型安全
const {username, enableLogging} = await getStorage(['username', 'enableLogging']);
// ✅ TypeScript 知道返回类型为 {username: string, enableLogging: boolean}
```

---

## React 规范

### 组件定义

#### 1. 函数式组件

```typescript
// ✅ 推荐: 使用 FC 类型
import type {FC} from 'react';

const Popup: FC = () => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    // 副作用
  }, []);

  return <div>{data}</div>;
};

export default Popup;
```

#### 2. Props 解构

```typescript
// ✅ 推荐: 参数中解构
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  children,
  className,
  ...props  // 传递原生HTML属性
}) => {
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
};
```

#### 3. 组件命名

- **组件名**: PascalCase (Button, TabInfo)
- **文件名**: PascalCase (Button.tsx, TabInfo.tsx)
- **样式文件**: PascalCase.module.scss (Button.module.scss)

### Hooks 使用

#### 1. useState 类型推断

```typescript
// ✅ 推荐: 显式类型
const [username, setUsername] = useState<string>('');

// ✅ 也可以: 类型推断
const [count, setCount] = useState(0); // 推断为 number

// ✅ 复杂类型使用 interface
interface TabData {
  title: string;
  url: string;
  favIconUrl?: string;
}
const [tabInfo, setTabInfo] = useState<TabData | null>(null);
```

#### 2. useEffect 依赖数组

```typescript
// ✅ 推荐: 完整声明依赖
useEffect(() => {
  browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    // ...
  });
}, []); // 空数组 = 仅运行一次

// ✅ 响应式依赖
useEffect(() => {
  fetchData();
}, [username]); // username 变化时重新运行

// ❌ 避免: 省略依赖 (除非你明确知道后果)
useEffect(() => {
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // 如果 fetchData 依赖外部变量,应该声明
```

### 事件处理

#### 1. 事件处理器类型

```typescript
// ✅ 推荐: 显式类型声明
const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
  setUsername(e.target.value);
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();
  await setStorage({username});
};

const handleClick = (): void => {
  browser.tabs.create({url: '/Options/options.html'});
};

// ✅ 内联处理器
onChange={(e): void => setUsername(e.target.value)}
onClick={handleClick}
onSubmit={handleSubmit}
```

#### 2. 异步事件处理

```typescript
// ✅ 推荐: 使用 async/await
const handleSave = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();

  try {
    await setStorage({username});
    setSaved(true);
  } catch (error) {
    console.error('Save failed:', error);
  }
};
```

### 条件渲染

```typescript
// ✅ 推荐: 使用 && 运算符
{tabInfo && <TabInfo {...tabInfo} />}

// ✅ 推荐: 使用三元运算符
{loading ? <Spinner /> : <Content />}

// ✅ 推荐: 使用多个条件
{pageInfo && visitCount && (
  <div>
    <PageStats {...pageInfo} />
    <VisitCount count={visitCount} />
  </div>
)}

// ❌ 避免: 嵌套三元运算符
{condition1
  ? condition2
    ? <A />
    : <B />
  : <C />
}
```

### 列表渲染

```typescript
// ✅ 推荐: 使用 key
{items.map((item) => (
  <div key={item.id}>
    {item.name}
  </div>
))}

// ✅ 推荐: 使用稳定的 key (不要用 index)
{items.map((item, index) => (
  // ❌ 除非列表是静态的
  <div key={item.id}>  {/* ✅ 使用唯一ID */}
    {item.name}
  </div>
))}
```

---

## 导入顺序规范

### 标准导入顺序

```typescript
// 1. React 相关
import {useEffect, useState} from 'react';
import type {FC} from 'react';

// 2. 第三方库
import browser from 'webextension-polyfill';

// 3. 内部模块 (使用 @ 别名)
import {getStorage, setStorage} from '../utils/storage';
import {Button} from '../components/Button/Button';
import {TabInfo} from './components/TabInfo/TabInfo';

// 4. 类型导入
import type {ExtensionMessage} from '../types/messages';
import type {TabData} from './types';

// 5. 样式文件
import styles from './Popup.module.scss';

// 6. 静态资源 (如果有)
import icon from './assets/icon.png';
```

### 路径别名

```typescript
// ✅ 推荐: 使用 @ 别名指向 source 目录
import {Button} from '@/components/Button/Button';

// ✅ 推荐: 使用 ~ 别名指向 node_modules
import something from '~/library';

// ❌ 避免: 使用相对路径 (跨多级目录)
import {Button} from '../../../components/Button/Button';
```

---

## SCSS/CSS 规范

### CSS Modules

**所有组件样式必须使用 CSS Modules**:

```scss
// Button.module.scss
.button {
  padding: 11px 16px;
  border: none;
  border-radius: 10px;
}

.primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
}
```

```typescript
// Button.tsx
import styles from './Button.module.scss';

<button className={styles.button}>Click</button>
```

### SCSS 导入顺序

```scss
// 1. 字体
@use "../styles/fonts";

// 2. 重置
@use "../styles/reset";

// 3. 变量
@use "../styles/variables";

// 4. 组件样式
.component {
  // ...
}
```

### 命名规范

#### 1. 类名使用 camelCase

```scss
// ✅ 推荐
.statsCard { }
.statsTitle { }
.statsGrid { }
.statItem { }
.statValue { }

// ❌ 避免 (kebab-case, snake_case)
.stats-card { }
.stats_card { }
```

#### 2. BEM 风格的变体

```scss
// ✅ 推荐: 清晰的层级结构
.statsCard {
  background: white;
  padding: 16px;

  &.large {
    padding: 24px;
  }
}

.statsTitle {
  font-size: 13px;
  font-weight: 600;
}

.statsGrid {
  display: grid;
  gap: 12px;
}

.statItem {
  display: flex;
  flex-direction: column;
}

.statValue {
  font-size: 20px;
  font-weight: 700;
}

.statLabel {
  font-size: 11px;
  color: #64748b;
}
```

### 使用变量

```scss
@use "../styles/variables";

.button {
  background: variables.$primary;
  border-radius: variables.$radiusMd;
  font-weight: variables.$semibold;
  box-shadow: variables.$shadowMd;
}
```

### 响应式设计

```scss
// Popup 通常不需要响应式 (固定宽度)
.popup {
  width: 380px;
  padding: 20px;
}

// Options 页面可能需要响应式
.options {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 600px) {
    padding: 20px;
  }
}
```

### 全局样式

```scss
// ✅ 推荐: 使用 :global() 修改全局样式
:global(body) {
  color: variables.$black;
  background: linear-gradient(180deg, #f8f9fc 0%, #eef2f7 100%);
}

// ❌ 避免: 组件样式污染全局
.button {
  // 所有 .button 元素都会受影响
}
```

---

## 浏览器扩展特定规范

### 消息通信

#### 1. 类型安全的消息定义

```typescript
// types/messages.ts

// ✅ 定义所有消息类型
export interface GetPageInfoMessage {
  type: 'GET_PAGE_INFO';
}

export interface PageInfoResponseMessage {
  type: 'PAGE_INFO_RESPONSE';
  data: PageInfo;
}

// ✅ 使用联合类型
export type ExtensionMessage =
  | GetPageInfoMessage
  | PageInfoResponseMessage
  | PageVisitedMessage;
```

#### 2. 发送消息

```typescript
// ✅ 推荐: 类型化消息
browser.runtime.sendMessage({
  type: 'PAGE_VISITED',
  data: pageInfo,
} satisfies PageVisitedMessage);

// ✅ 或者直接发送
browser.runtime.sendMessage({
  type: 'PAGE_VISITED',
  data: pageInfo,
});
```

#### 3. 接收消息

```typescript
// ✅ 推荐: 类型断言 + 检查
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage;

  if (msg.type === 'PAGE_VISITED') {
    // TypeScript 自动推断 msg.data 类型为 PageInfo
    console.log(msg.data.title);
  }

  return Promise.resolve();
});
```

### 存储操作

#### 1. 使用类型安全的工具函数

```typescript
// ✅ 推荐
import {getStorage, setStorage} from '../utils/storage';

const {username, enableLogging} = await getStorage(['username', 'enableLogging']);
await setStorage({username: 'John'});

// ❌ 避免: 直接使用 browser API (缺少类型检查)
const result = await browser.storage.local.get(['username']);
```

#### 2. 存储 Schema 定义

```typescript
// types/storage.ts

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

### 异步操作

#### 1. 始终使用 async/await

```typescript
// ✅ 推荐
const handleSave = async (): Promise<void> => {
  await setStorage({username});
  console.log('Saved');
};

// ✅ 推荐: 处理错误
const handleSave = async (): Promise<void> => {
  try {
    await setStorage({username});
    console.log('Saved');
  } catch (error) {
    console.error('Failed to save:', error);
  }
};

// ❌ 避免: Promise 链
getStorage(['username']).then((result) => {
  // ...
}).catch((error) => {
  // ...
});
```

#### 2. 异步组件初始化

```typescript
// ✅ 推荐: useEffect 中初始化
useEffect(() => {
  const init = async (): Promise<void> => {
    const {username} = await getStorage(['username']);
    setUsername(username);
  };

  init();
}, []);

// ✅ 推荐: IIFE 立即执行
useEffect(() => {
  (async (): Promise<void> => {
    const {username} = await getStorage(['username']);
    setUsername(username);
  })();
}, []);
```

---

## 代码组织

### 文件组织

```
ComponentName/
├── ComponentName.tsx       # 主组件
├── ComponentName.module.scss  # 样式
├── index.ts                # 导出 (可选)
└── types.ts                # 类型定义 (可选)
```

### 组件导出

```typescript
// ✅ 推荐: 命名导出
export const Button: FC<ButtonProps> = (props) => {
  return <button {...props} />;
};

// ✅ 推荐: 默认导出 (页面组件)
const Popup: FC = () => {
  return <div>...</div>;
};
export default Popup;

// ✅ 推荐: 统一导出 (index.ts)
export {Button} from './Button';
export {Input} from './Input';
export {Checkbox} from './Checkbox';
```

### 常量定义

```typescript
// ✅ 推荐: 集中定义常量
const CONSTANTS = {
  MAX_RETRIES: 3,
  TIMEOUT: 5000,
  DEFAULT_URL: 'https://example.com',
} as const;

// ✅ 推荐: 使用 as const
const MESSAGES = {
  GET_PAGE_INFO: 'GET_PAGE_INFO',
  PAGE_INFO_RESPONSE: 'PAGE_INFO_RESPONSE',
} as const;

// ❌ 避免: 魔法数字
if (retryCount > 3) {
  // ...
}
```

---

## 注释规范

### JSDoc 注释

```typescript
/**
 * 获取存储中的指定键值
 * @param keys - 要获取的键数组
 * @returns Promise<Pick<StorageSchema, K>>
 * @example
 * ```typescript
 * const {username} = await getStorage(['username']);
 * ```
 */
export async function getStorage<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  // ...
}
```

### 组件注释

```typescript
/**
 * Popup Component
 *
 * This is the main UI that appears when the user clicks the extension icon.
 * It communicates with both the content script and background script.
 */
const Popup: FC = () => {
  // ...
};
```

### 复杂逻辑注释

```typescript
// ✅ 推荐: 解释"为什么"而不是"是什么"
// Content Script 必须打包为 IIFE,因为浏览器的 content script
// 执行环境不支持 ES Module
buildIIFEScripts({
  scripts: [{
    name: 'contentScript',
    entry: path.resolve(sourcePath, 'ContentScript/index.ts'),
  }],
  outDir: getOutDir(),
});

// ❌ 避免: 无意义的注释
// 设置 username
setUsername('John');
```

---

## 性能最佳实践

### React 优化

#### 1. 使用 useMemo 缓存计算结果

```typescript
const filteredItems = useMemo(() => {
  return items.filter((item) => item.active);
}, [items]);
```

#### 2. 使用 useCallback 缓存回调

```typescript
const handleClick = useCallback(() => {
  browser.tabs.create({url});
}, [url]);
```

#### 3. 避免不必要的重渲染

```typescript
// ✅ 推荐: 使用 React.memo
export const TabInfo = React.FC<TabInfoProps> = memo(({ title, url }) => {
  return <div>{title}: {url}</div>;
});
```

### 浏览器扩展优化

#### 1. 延迟加载

```typescript
// ✅ 推荐: 按需加载数据
useEffect(() => {
  let isMounted = true;

  const loadData = async (): Promise<void> => {
    const data = await fetchData();
    if (isMounted) {
      setState(data);
    }
  };

  loadData();

  return () => {
    isMounted = false;
  };
}, []);
```

#### 2. 避免频繁存储操作

```typescript
// ✅ 推荐: 批量更新
await setStorage({
  username,
  enableLogging,
  visitCount,
});

// ❌ 避免: 多次单独更新
await setStorage({username});
await setStorage({enableLogging});
await setStorage({visitCount});
```

---

## 错误处理

### 异步错误处理

```typescript
// ✅ 推荐: try-catch
const handleSave = async (): Promise<void> => {
  try {
    await setStorage({username});
    setSaved(true);
  } catch (error) {
    console.error('Failed to save:', error);
    setError('Failed to save settings');
  }
};

// ✅ 推荐: Promise.catch
browser.tabs.sendMessage(tabId, {type: 'GET_PAGE_INFO'})
  .then((response) => {
    setPageInfo(response.data);
  })
  .catch(() => {
    // Content script 可能未注入
    console.log('Content script not available');
  });
```

### 类型错误处理

```typescript
// ✅ 推荐: 类型守卫
function isExtensionMessage(message: unknown): message is ExtensionMessage {
  return typeof message === 'object' && message !== null && 'type' in message;
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isExtensionMessage(message)) {
    return;
  }

  // TypeScript 知道 message 是 ExtensionMessage
  if (message.type === 'GET_PAGE_INFO') {
    // ...
  }
});
```

---

## 测试规范

(待补充: 单元测试、集成测试、E2E测试规范)

---

## 文档规范

### README 要求

每个功能模块应包含:
- 功能描述
- 使用示例
- 依赖关系
- 已知限制

### 代码审查清单

- [ ] 遵循导入顺序规范
- [ ] 所有类型已正确定义
- [ ] 异步函数有错误处理
- [ ] 没有使用 `any` 类型 (除非必要)
- [ ] 组件有适当的 Props 类型定义
- [ ] 消息通信使用类型化接口
- [ ] 存储操作使用类型安全的工具函数
- [ ] 样式使用 CSS Modules
- [ ] 代码通过 ESLint 检查
- [ ] 复杂逻辑有注释说明

---

## 参考资料

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/)
- [WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [CSS Modules](https://github.com/css-modules/css-modules)
