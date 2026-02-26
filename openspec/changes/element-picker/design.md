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
- 信息标签不可交互(纯展示,无点击/复制功能)
- 不使用过渡动画(即时响应,无延迟)

## Decisions

### 1. 高亮实现方式: 覆盖层 DOM 元素而非内联 style

**决策**: 使用独立的半透明覆盖层 DOM 元素创建高亮效果,不直接修改目标元素样式。

**理由**:
- **完全隔离**: 不污染目标元素的样式,无 CSS 优先级冲突
- **扩展性强**: 可以添加信息标签,显示元素元信息
- **易于清理**: 直接删除覆盖层元素即可,无需记住每个修改的属性
- **专业外观**: 类似 DevTools 的视觉效果,半透明蓝色背景 + 边框

**覆盖层结构**:
- 高亮层: `position: absolute`, `pointer-events: none`, 蓝色半透明背景
- 信息标签: `position: absolute`, `pointer-events: none`, 显示元素信息
- 容器: 添加到 `document.body`,使用超高 `z-index: 2147483640`

**替代方案**:
- 内联样式: 会污染元素样式,可能与页面 `!important` 规则冲突
- CSS 类: 需要注入样式表,清理时需要移除类名

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

### 6. 信息标签设计: 简洁核心信息

**决策**: 在覆盖层旁显示简洁的元素信息标签,完全不可交互。

**显示内容**:
- 第一行(必选): `{tagName}  {width}x{height}` (使用小写 x)
- 第二行(可选): 如果有 ID 显示 `#{id}`,如果有类名显示 `.{className}`

**视觉风格**:
- 背景: `#1e1e1e` (深灰,类似 DevTools)
- 标签名: `#569CD6` (蓝色)
- ID: `#DCDCAA` (黄色)
- 类名: `#CE9178` (橙色)
- 尺寸: `#b5cea8` (浅绿)
- 字体: `'SF Mono', 'Consolas', monospace`
- 字号: `12px`
- 圆角: `3px`
- 内边距: `6px 10px`
- 无过渡动画(即时响应)

**理由**:
- **信息丰富**: 用户可以快速了解元素类型和尺寸
- **不干扰**: 不可交互,不影响元素选择
- **专业感**: 类似 DevTools 的视觉风格

### 7. 智能定位算法

**决策**: 信息标签使用智能定位,在 6 个候选位置中选择最佳位置。

**候选位置优先级**:
1. 右上: 元素右侧,垂直对齐顶部
2. 右下: 元素右侧,垂直对齐底部
3. 左上: 元素左侧,垂直对齐顶部
4. 左下: 元素左侧,垂直对齐底部
5. 上方居中: 元素上方
6. 下方居中: 元素下方
7. 回退: 元素内部左上角

**评分标准**:
- 必须完全在视口内
- 周围空白空间越大越好
- 距离视口边缘越远越好

**理由**:
- **避免遮挡**: 自动选择空旷区域,不影响用户查看元素
- **适应性强**: 无论元素在屏幕何处,都能找到合适位置
- **用户体验**: 减少调整标签位置的需要

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

### Risk 4: 覆盖层位置可能不准确

**风险**: 元素有 `transform` 或滚动时,覆盖层位置可能不匹配。

**缓解措施**:
- MVP 阶段接受简单实现,使用 `getBoundingClientRect()`
- `getBoundingClientRect()` 返回的是变换后的矩形,可处理大部分 transform 场景
- 滚动时会在下次 `mouseover` 事件中自动更新位置

### Risk 5: 覆盖层 DOM 可能影响页面性能

**风险**: 频繁更新覆盖层位置可能导致性能问题。

**缓解措施**:
- 使用 `position: absolute` 配合 `left/top` 而非 `transform` (虽然性能稍差,但实现简单)
- 不使用过渡动画,避免视觉延迟
- MVP 阶段不优化,现代浏览器性能足够
- 后续可使用 `requestAnimationFrame` 优化

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

1. **覆盖层 DOM 结构**:
   ```typescript
   // 创建容器
   const container = document.createElement('div');
   container.id = 'picker-overlay-root';
   container.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0;';

   // 创建高亮层
   const highlight = document.createElement('div');
   highlight.className = 'picker-highlight';
   highlight.style.cssText = `
     position: absolute;
     pointer-events: none;
     background: rgba(33, 150, 243, 0.15);
     border: 2px solid #2196F3;
     box-sizing: border-box;
     z-index: 2147483640;
   `;

   // 创建信息标签
   const label = document.createElement('div');
   label.className = 'picker-label';
   label.style.cssText = `
     position: absolute;
     pointer-events: none;
     background: #1e1e1e;
     color: #d4d4d4;
     padding: 6px 10px;
     font-family: 'SF Mono', 'Consolas', monospace;
     font-size: 12px;
     line-height: 1.4;
     border-radius: 3px;
     white-space: nowrap;
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
     z-index: 2147483641;
   `;
   ```

2. **更新覆盖层位置**:
   ```typescript
   private updateOverlay(target: HTMLElement): void {
     const rect = target.getBoundingClientRect();

     // 更新高亮层
     this.highlightOverlay.style.left = rect.left + 'px';
     this.highlightOverlay.style.top = rect.top + 'px';
     this.highlightOverlay.style.width = rect.width + 'px';
     this.highlightOverlay.style.height = rect.height + 'px';

     // 更新信息标签
     const labelPos = this.calculateLabelPosition(rect);
     this.infoLabel.style.left = labelPos.x + 'px';
     this.infoLabel.style.top = labelPos.y + 'px';

     // 更新标签内容
     this.updateLabelContent(target, rect);
   }
   ```

3. **智能定位算法**:
   ```typescript
   private calculateLabelPosition(rect: DOMRect): {x: number, y: number} {
     const labelWidth = 150; // 估算宽度
     const labelHeight = 50;  // 估算高度
     const gap = 8;

     // 候选位置
     const candidates = [
       {x: rect.right + gap, y: rect.top},                    // 右上
       {x: rect.right + gap, y: rect.bottom - labelHeight},   // 右下
       {x: rect.left - labelWidth - gap, y: rect.top},        // 左上
       {x: rect.left - labelWidth - gap, y: rect.bottom - labelHeight}, // 左下
     ];

     // 选择第一个在视口内的位置
     const viewport = {width: window.innerWidth, height: window.innerHeight};
     for (const pos of candidates) {
       if (pos.x >= 0 && pos.x + labelWidth <= viewport.width &&
           pos.y >= 0 && pos.y + labelHeight <= viewport.height) {
         return pos;
       }
     }

     // 回退到元素内部
     return {x: rect.left, y: rect.top};
   }
   ```

4. **生成标签内容**:
   ```typescript
   private updateLabelContent(target: HTMLElement, rect: DOMRect): void {
     const tagName = target.tagName.toLowerCase();
     const width = Math.round(rect.width);
     const height = Math.round(rect.height);

     let html = `<span style="color: #569CD6;">${this.escapeHtml(tagName)}</span> `;
     html += `<span style="color: #b5cea8;">${width}x${height}</span>`;

     // 第二行: ID 和类名
     if (target.id || target.className) {
       html += '<div>';
       if (target.id) {
         html += `<span style="color: #DCDCAA;">#${this.escapeHtml(target.id)}</span> `;
       }
       if (target.className) {
         const classes = target.className.split(' ')
           .filter(c => c)
           .map(c => `.${this.escapeHtml(c)}`)
           .join(' ');
         html += `<span style="color: #CE9178;">${classes}</span>`;
       }
       html += '</div>';
     }

     this.infoLabel.innerHTML = html;
   }

   private escapeHtml(text: string): string {
     const div = document.createElement('div');
     div.textContent = text;
     return div.innerHTML;
   }
   ```

5. **事件监听器必须在捕获阶段**:
   ```typescript
   document.addEventListener('mouseover', this.handleMouseOver, {
     capture: true
   });
   ```

6. **清理时必须移除覆盖层**:
   ```typescript
   private cleanup(): void {
     this.detachEventListeners();
     this.overlayContainer?.remove();
     this.overlayContainer = null;
     this.highlightOverlay = null;
     this.infoLabel = null;
   }
   ```

7. **消息处理必须有错误处理**:
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
