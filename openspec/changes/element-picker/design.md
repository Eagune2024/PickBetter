## Context

PickBetter 浏览器扩展目前具备基础的页面信息收集和展示功能,但缺少与页面元素交互的能力。用户需要一种可视化方式来选择和识别页面元素,这将为未来的元素信息提取、选择器生成等功能奠定基础。

**当前状态**:
- Content Script 已实现页面信息收集(word count, link count, image count)
- Popup 可以与 Content Script 和 Background Script 通信
- 消息类型定义在 `types/messages.ts`,使用 TypeScript 联合类型确保类型安全
- Content Script 作为 IIFE 打包,不支持 ES Module

**技术约束**:
- 必须使用消息驱动架构(Popup ↔ Content Script ↔ Background)
- Content Script 运行在隔离的环境中,无法直接访问扩展API
- 事件处理需要在捕获阶段进行,以优先于页面事件
- 内联样式必须使用 `!important` 确保不被页面样式覆盖

## Goals / Non-Goals

**Goals:**
- 实现一个简单、可靠的元素选择器,支持鼠标悬浮高亮和点击选中
- 通过消息通信与 Popup 集成,提供启动/停止控制
- 支持键盘快捷键(ESC)快速退出选择模式
- 点击元素时输出基本信息到控制台,便于调试和验证
- 保持代码简洁,为后续扩展(Tooltip、状态指示器等)留有空间

**Non-Goals:**
- 不支持 Shadow DOM、iframe、SVG 等复杂场景(明确排除在MVP范围外)
- 不实现性能优化(防抖、节流、虚拟滚动等)
- 不生成选择器字符串或提取复杂元素信息
- 不实现多选功能
- 不添加 Tooltip 信息提示或状态指示器(可选的后续增强)

## Decisions

### 1. 高亮实现方式: 内联 style 而非 CSS 类

**决策**: 使用 `element.style.outline` 直接设置内联样式,不添加 CSS 类。

**理由**:
- **简单直接**: 无需注入额外的样式表,避免与页面样式冲突
- **优先级最高**: 内联样式天然优先级高,配合 `!important` 确保不被覆盖
- **易于清理**: 直接设置空字符串即可移除样式
- **性能好**: 无需查询样式表,直接修改 DOM

**替代方案**:
- CSS 类: 需要注入样式表,可能与页面样式冲突,清理时需要移除类名

### 2. 事件监听: 捕获阶段而非冒泡阶段

**决策**: 在 `document` 上使用捕获阶段 (`{ capture: true }`) 监听事件。

**理由**:
- **优先级高**: 捕获阶段在页面事件处理器之前执行
- **可阻止传播**: 可以调用 `stopPropagation()` 阻止事件传递到页面
- **可阻止默认**: 可以调用 `preventDefault()` 阻止默认行为(如链接跳转)
- **符合定位**: 作为"工具层",应该在页面逻辑之前拦截事件

**替代方案**:
- 冒泡阶段: 可能被页面的事件处理器阻止,无法保证优先级

### 3. 状态管理: 布尔标志而非状态机

**决策**: 使用一个 `isActive` 布尔值管理选择器状态,不实现复杂的状态机。

**理由**:
- **MVP 范围**: 只有"激活"和"非激活"两种状态,无需复杂状态机
- **代码简洁**: 布尔值易于理解和维护
- **性能好**: 无需状态转换逻辑,直接判断

**替代方案**:
- 状态机(IDLE/PICKING/SELECTED): 过度设计,增加复杂度

### 4. 元素信息输出: console.log 而非消息通信

**决策**: 点击元素时使用 `console.log()` 输出信息,不发送消息到 Popup。

**理由**:
- **MVP 验证**: 初期只需验证选择功能,console.log 最简单
- **易于调试**: 开发者可以直接在控制台查看输出
- **减少复杂度**: 无需定义复杂的数据结构和消息类型

**后续扩展**: 未来可以改为发送消息到 Popup,并在 UI 中显示

### 5. 模块设计: 独立的 ElementPicker 类

**决策**: 将选择器实现为独立的 `ElementPicker` 类,导出 `startPicker()` 和 `stopPicker()` 函数。

**理由**:
- **封装性好**: 所有选择器逻辑集中在一个类中
- **可复用**: 未来可以在多个地方使用
- **易于测试**: 独立的类便于单元测试
- **清晰API**: 公共方法简单明确

**替代方案**:
- 函数式实现: 也可以,但类更利于状态管理

### 6. 样式规范: outline 而非 border

**决策**: 使用 `outline` 属性创建高亮边框,不使用 `border`。

**理由**:
- **不影响布局**: outline 不占用盒模型空间,不会影响元素布局
- **性能好**: 浏览器优化了 outline 的渲染
- **标准做法**: DevTools 等工具也使用 outline

**实现细节**:
```typescript
element.style.outline = '2px solid #2196F3';
element.style.outlineOffset = '-2px'; // 负值向内偏移,避免遮挡
```

## Risks / Trade-offs

### Risk 1: 页面样式可能覆盖高亮样式

**风险**: 某些页面可能使用 `!important` 覆盖 `outline` 属性。

**缓解措施**:
- 在设置样式时也使用 `!important`
- 使用 `setProperty()` 方法并传入 priority 参数:
  ```typescript
  element.style.setProperty('outline', '2px solid #2196F3', 'important');
  ```

### Risk 2: Content Script 未注入导致功能不可用

**风险**: 用户在某些页面(如 `chrome://` 页面)或刚安装扩展时,Content Script 可能未注入。

**缓解措施**:
- Popup 发送消息时使用 `try-catch` 捕获错误
- 显示友好的错误提示:"请刷新页面后重试"
- 在 Popup 中显示选择器状态,避免重复点击

### Risk 3: 快速移动鼠标导致性能问题

**风险**: 在元素密集的页面快速移动鼠标,可能触发大量 `mouseover` 事件。

**缓解措施**:
- MVP 阶段暂不优化,现代浏览器性能足够
- 后续可添加防抖(16ms,对应 60fps)
- 后续可使用 `requestAnimationFrame` 批量更新

### Risk 4: 某些元素可能无法高亮

**风险**: 某些特殊元素(如 `video`, `canvas`)可能不响应 `outline` 样式。

**缓解措施**:
- MVP 阶段忽略这些边缘情况
- 后续可针对特殊元素使用独立的高亮 overlay

### Risk 5: 页面滚动导致高亮不同步

**风险**: 用户滚动页面时,高亮边框可能停留在错误的位置。

**缓解措施**:
- outline 是相对于元素的,会自动跟随元素位置
- 无需特殊处理,浏览器会自动更新

## Migration Plan

### 部署步骤

1. **第一阶段: Content Script 实现**
   - 创建 `source/ContentScript/elementPicker.ts`
   - 实现 `ElementPicker` 类的核心逻辑
   - 导出 `startPicker()` 和 `stopPicker()` 函数

2. **第二阶段: 消息类型定义**
   - 更新 `source/types/messages.ts`
   - 添加 `StartPickerMessage` 和 `StopPickerMessage` 类型
   - 扩展 `ExtensionMessage` 联合类型

3. **第三阶段: Content Script 集成**
   - 更新 `source/ContentScript/index.ts`
   - 导入 `elementPicker` 模块
   - 添加消息监听器处理 `START_PICKER` 和 `STOP_PICKER`

4. **第四阶段: Popup UI**
   - 更新 `source/Popup/Popup.tsx`
   - 添加"选择元素"按钮和状态管理
   - 实现错误处理和用户提示

5. **第五阶段: 样式实现**
   - 更新 `source/Popup/Popup.module.scss`
   - 添加按钮和提示文本的样式

6. **第六阶段: 测试验证**
   - 在 Chrome 和 Firefox 中测试
   - 验证基础功能(启动、高亮、点击、退出)
   - 修复发现的 bug

### 回滚策略

- **无风险**: 这是一个新增功能,不影响现有功能
- **可禁用**: 如果发现问题,可以移除 Popup 中的按钮即可禁用功能
- **可回退**: Git 版本控制,随时可以回滚到之前的 commit

## Open Questions

无(所有技术决策已在提案和探索阶段确定)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Popup                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [选择元素] 按钮                                 │   │
│  │  点击 → browser.tabs.sendMessage(tabId, {       │   │
│  │    type: 'START_PICKER'                         │   │
│  │  })                                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Content Script (IIFE)                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  elementPicker.ts                               │   │
│  │                                                 │   │
│  │  class ElementPicker {                          │   │
│  │    isActive: boolean = false                    │   │
│  │    currentElement: HTMLElement | null = null    │   │
│  │                                                 │   │
│  │    start(): attach event listeners              │   │
│  │    stop(): cleanup and detach                   │   │
│  │                                                 │   │
│  │    private handleMouseOver(e) {                 │   │
│  │      e.preventDefault()                         │   │
│  │      e.stopPropagation()                        │   │
│  │      highlight(target)                         │   │
│  │    }                                            │   │
│  │                                                 │   │
│  │    private handleClick(e) {                     │   │
│  │      e.preventDefault()                         │   │
│  │      e.stopPropagation()                        │   │
│  │      console.log(elementInfo)                  │   │
│  │      this.stop()                                │   │
│  │    }                                            │   │
│  │  }                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Notes

### 关键实现细节

1. **事件监听器必须在捕获阶段**:
   ```typescript
   document.addEventListener('mouseover', this.handleMouseOver, {
     capture: true
   });
   ```

2. **样式必须使用 !important**:
   ```typescript
   element.style.setProperty('outline', '2px solid #2196F3', 'important');
   element.style.setProperty('outline-offset', '-2px', 'important');
   ```

3. **清理时必须移除事件监听器**:
   ```typescript
   document.removeEventListener('mouseover', this.handleMouseOver, {
     capture: true
   });
   ```

4. **消息处理必须有错误处理**:
   ```typescript
   try {
     await browser.tabs.sendMessage(tabId, {type: 'START_PICKER'});
   } catch (error) {
     console.error('Failed to start picker:', error);
     alert('请刷新页面后重试');
   }
   ```

### 测试策略

1. **基础功能测试**:
   - 点击按钮 → 选择模式启动
   - 鼠标悬浮 → 元素高亮
   - 点击元素 → console.log 输出
   - 按 ESC → 退出选择模式

2. **边界情况测试**:
   - Content Script 未注入 → 显示错误提示
   - 点击链接 → 不会跳转
   - 点击按钮 → 不会触发按钮点击事件

3. **跨浏览器测试**:
   - Chrome 88+
   - Firefox 112+
   - 验证功能一致性
