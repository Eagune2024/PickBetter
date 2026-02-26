# Implementation Tasks

## 1. 消息类型定义

- [x] 1.1 在 `source/types/messages.ts` 中添加 `StartPickerMessage` 接口
  - 定义接口: `{ type: 'START_PICKER' }`
  - 验收标准: 接口定义符合 TypeScript 规范,无类型错误

- [x] 1.2 在 `source/types/messages.ts` 中添加 `StopPickerMessage` 接口
  - 定义接口: `{ type: 'STOP_PICKER' }`
  - 验收标准: 接口定义符合 TypeScript 规范,无类型错误

- [x] 1.3 更新 `ExtensionMessage` 联合类型
  - 将 `StartPickerMessage` 和 `StopPickerMessage` 添加到联合类型
  - 验收标准: 联合类型包含所有消息类型,TypeScript 编译通过

## 2. ElementPicker 核心类实现

- [x] 2.1 创建 `source/ContentScript/elementPicker.ts` 文件
  - 定义 `ElementPicker` 类
  - 添加私有属性: `isActive`, `currentElement`
  - 验收标准: 文件创建成功,类定义正确,无 TypeScript 错误

- [x] 2.2 实现 `start()` 方法
  - 设置 `isActive = true`
  - 调用 `attachEventListeners()`
  - 在控制台输出"选择模式已启动,按ESC退出"
  - 验收标准: 方法正确启动选择模式,事件监听器已注册

- [x] 2.3 实现 `stop()` 方法
  - 调用 `cleanup()` 清理状态
  - 设置 `isActive = false`
  - 在控制台输出"选择模式已退出"
  - 验收标准: 方法正确停止选择模式,所有副作用已清理

- [x] 2.4 实现 `attachEventListeners()` 方法
  - 在 `document` 上监听 `mouseover` 事件(捕获阶段)
  - 在 `document` 上监听 `click` 事件(捕获阶段)
  - 在 `document` 上监听 `keydown` 事件
  - 验收标准: 三个事件监听器正确注册,使用捕获阶段

- [x] 2.5 实现 `detachEventListeners()` 方法
  - 移除 `mouseover` 事件监听器(捕获阶段)
  - 移除 `click` 事件监听器(捕获阶段)
  - 移除 `keydown` 事件监听器
  - 验收标准: 所有事件监听器正确移除,无内存泄漏

- [x] 2.6 实现 `handleMouseOver` 事件处理器
  - 调用 `e.preventDefault()` 和 `e.stopPropagation()`
  - 如果存在旧的高亮元素,先移除其高亮
  - 高亮当前悬浮的元素
  - 更新 `currentElement` 引用
  - 验收标准: 鼠标悬浮时元素高亮显示,切换元素时高亮正确更新

- [x] 2.7 实现 `handleClick` 事件处理器
  - 调用 `e.preventDefault()` 和 `e.stopPropagation()`
  - 提取元素信息(tagName, id, className, textContent)
  - 在控制台输出元素信息
  - 调用 `stop()` 退出选择模式
  - 验收标准: 点击元素时输出信息到控制台,自动退出选择模式,链接不跳转

- [x] 2.8 实现 `handleKeyDown` 事件处理器
  - 检测 ESC 键(`e.key === 'Escape'`)
  - 如果是 ESC,调用 `stop()` 退出选择模式
  - 验收标准: 按 ESC 键正确退出选择模式,其他键不影响

- [x] 2.9 实现 `highlight()` 私有方法
  - 使用 `element.style.setProperty()` 设置样式
  - 设置 `outline: 2px solid #2196F3` (important)
  - 设置 `outline-offset: -2px` (important)
  - 设置 `cursor: crosshair`
  - 验收标准: 元素显示蓝色边框,光标变为 crosshair,样式不被页面覆盖

- [x] 2.10 实现 `unhighlight()` 私有方法
  - 移除 `outline`, `outline-offset`, `cursor` 样式
  - 验收标准: 元素恢复原始样式,无残留样式

- [x] 2.11 实现 `cleanup()` 私有方法
  - 调用 `detachEventListeners()` 移除事件监听器
  - 如果 `currentElement` 存在,调用 `unhighlight()` 移除高亮
  - 重置 `currentElement` 为 `null`
  - 验收标准: 所有副作用清理完毕,选择器可以重新启动

- [x] 2.12 实现单例模式的导出函数
  - 创建模块级变量 `pickerInstance`
  - 导出 `startPicker()` 函数:创建或复用 `ElementPicker` 实例并调用 `start()`
  - 导出 `stopPicker()` 函数:调用实例的 `stop()` 方法
  - 验收标准: 导出函数正常工作,多次调用复用同一实例

## 3. Content Script 集成

- [x] 3.1 在 `source/ContentScript/index.ts` 中导入 elementPicker 模块
  - 添加 `import {startPicker, stopPicker} from './elementPicker';`
  - 验收标准: 导入语句正确,无 TypeScript 错误

- [x] 3.2 在消息监听器中添加 `START_PICKER` 消息处理
  - 在 `browser.runtime.onMessage.addListener` 中添加 case 分支
  - 调用 `startPicker()` 启动选择器
  - 在控制台输出"收到启动选择器消息"
  - 验收标准: 收到消息时正确启动选择器

- [x] 3.3 在消息监听器中添加 `STOP_PICKER` 消息处理
  - 在 `browser.runtime.onMessage.addListener` 中添加 case 分支
  - 调用 `stopPicker()` 停止选择器
  - 在控制台输出"收到停止选择器消息"
  - 验收标准: 收到消息时正确停止选择器

- [x] 3.4 在 Content Script 加载时输出日志
  - 添加 `console.log('[ContentScript] 元素选择器模块已加载');`
  - 验收标准: 页面加载时在控制台看到日志

## 4. Popup UI 实现

- [x] 4.1 在 `source/Popup/Popup.tsx` 中添加状态管理
  - 添加 `isPickerActive` 状态(`useState<boolean>`)
  - 验收标准: 状态定义正确,初始值为 `false`

- [x] 4.2 实现 `handleStartPicker` 异步函数
  - 获取当前活动标签页(`browser.tabs.query`)
  - 向 Content Script 发送 `START_PICKER` 消息
  - 使用 try-catch 处理错误
  - 成功时设置 `isPickerActive = true`
  - 失败时显示错误提示"请刷新页面后重试"
  - 验收标准: 点击按钮正确启动选择器或显示错误提示

- [x] 4.3 在 Popup JSX 中添加"选择元素"按钮
  - 添加 `<button>` 元素
  - 绑定 `onClick` 事件到 `handleStartPicker`
  - 按钮文本根据 `isPickerActive` 显示不同内容
  - 当 `isPickerActive` 为 true 时禁用按钮
  - 验收标准: 按钮显示正确,点击功能正常,禁用状态生效

- [x] 4.4 添加操作提示文本
  - 当 `isPickerActive` 为 true 时显示提示
  - 提示文本:"在页面上点击元素,按ESC退出"
  - 验收标准: 提示文本在选择模式激活时显示

- [x] 4.5 在 `source/Popup/Popup.module.scss` 中添加样式
  - 添加 `.pickerSection` 容器样式
  - 添加 `.pickerButton` 按钮样式(渐变背景、圆角、阴影)
  - 添加 `.pickerButton:hover` 悬浮样式
  - 添加 `.pickerButton:disabled` 禁用样式
  - 添加 `.pickerHint` 提示文本样式
  - 验收标准: 样式符合设计规范,视觉效果良好

## 5. 测试与验证

- [ ] 5.1 在 Chrome 中测试基础功能
  - 启动开发服务器(`npm run dev:chrome`)
  - 加载扩展到 Chrome
  - 测试:点击按钮 → 选择模式启动
  - 测试:鼠标悬浮 → 元素高亮
  - 测试:点击元素 → console.log 输出
  - 测试:按 ESC → 退出选择模式
  - 验收标准: 所有功能在 Chrome 中正常工作

- [ ] 5.2 在 Firefox 中测试基础功能
  - 启动开发服务器(`npm run dev:firefox`)
  - 加载扩展到 Firefox
  - 执行与 Chrome 相同的测试流程
  - 验收标准: 所有功能在 Firefox 中正常工作

- [ ] 5.3 测试边界情况
  - 测试:Content Script 未注入时的错误处理
  - 测试:点击链接是否被正确阻止
  - 测试:点击按钮是否被正确阻止
  - 测试:快速移动鼠标时高亮是否正常
  - 验收标准: 所有边界情况正确处理,无异常

- [x] 5.4 运行 ESLint 检查
  - 执行 `npm run lint`
  - 修复所有 linting 错误和警告
  - 验收标准: ESLint 检查通过,无错误

- [x] 5.5 验证 TypeScript 编译
  - 检查 TypeScript 编译是否成功
  - 确认无类型错误
  - 验收标准: TypeScript 编译成功,类型检查通过

## 6. 代码优化与文档

- [x] 6.1 添加代码注释
  - 为 `ElementPicker` 类添加文档注释
  - 为公共方法添加 JSDoc 注释
  - 为关键逻辑添加行内注释
  - 验收标准: 代码有适当的注释,易于理解

- [x] 6.2 代码格式化
  - 运行 `npm run lint:fix` 自动修复格式问题
  - 手动检查并调整不合理的格式
  - 验收标准: 代码格式符合项目规范

- [ ] 6.3 验证构建产物
  - 运行 `npm run build:chrome`
  - 检查 `extension/chrome/` 目录中的构建产物
  - 确认 Content Script 正确打包为 IIFE
  - 验收标准: 构建成功,产物符合预期

## 任务依赖关系

```
1. 消息类型定义 (独立)
    ↓
2. ElementPicker 核心类实现 (依赖 1)
    ↓
3. Content Script 集成 (依赖 2)
    ↓
4. Popup UI 实现 (依赖 1)
    ↓
5. 测试与验证 (依赖 2, 3, 4)
    ↓
6. 代码优化与文档 (依赖 5)
```

## 预估工作量

- **任务 1**: 30 分钟
- **任务 2**: 3-4 小时
- **任务 3**: 30 分钟
- **任务 4**: 1-2 小时
- **任务 5**: 1-2 小时
- **任务 6**: 30 分钟

**总计**: 6.5-9.5 小时
