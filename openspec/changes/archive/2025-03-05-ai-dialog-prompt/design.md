## Context

PickBetter 的元素选择器功能已实现基础的元素选择和高亮显示，但选中元素后会立即退出激活模式，仅输出元素信息到控制台。用户无法基于选中的元素进行进一步操作。

**当前状态**:
- `ElementPicker` 类使用单一布尔标志 `isActive` 管理状态
- 点击元素后调用 `this.stop()` 立即退出选择模式
- 覆盖层系统已实现：高亮层（highlightOverlay）和信息标签（infoLabel）
- 事件处理在捕获阶段进行，可阻止默认行为

**技术约束**:
- Content Script 必须打包为 IIFE，不支持 ES Module
- 对话框 DOM 元素必须使用超高 z-index 避免被页面样式覆盖
- 对话框元素必须支持用户交互（`pointer-events: auto`），与现有的不可交互覆盖层不同
- 必须防止对话框元素触发选择器的事件处理（鼠标悬浮、点击）

## Goals / Non-Goals

**Goals**:
- 扩展选择器状态管理为三状态机（IDLE / PICKING / SELECTED）
- 选中元素后显示浮动 AI 对话框，元素保持高亮
- 提供纯输入框界面，无按钮，通过快捷键操作
- 对话框智能定位，优先外部位置，无空间时放元素内部
- 提交后输出 prompt 和元素信息到 console（为 AI 交互预留接口）

**Non-Goals**:
- 不实现 AI 交互逻辑（下一阶段任务）
- 不支持对话框跟随页面滚动更新位置
- 不支持多选或批量调整
- 不处理元素被移除或 DOM 变化的边界情况
- 不与 Popup 通信（对话框完全在 Content Script 内部）
- 不实现对话框的历史记录或会话管理

## Decisions

### 1. 状态管理：三状态机而非布尔标志

**决策**: 将 `isActive: boolean` 扩展为 `state: PickerState`，支持三种状态。

**理由**:
- **状态清晰**: IDLE（未激活）、PICKING（选择中）、SELECTED（已选中并显示对话框）
- **行为区分**: 不同状态下事件处理逻辑不同（SELECTED 状态不响应鼠标悬浮和点击）
- **易于扩展**: 未来可添加更多状态（如 PROCESSING、ERROR 等）

**状态转换**:
```
IDLE → [startPicker()] → PICKING
PICKING → [点击元素] → SELECTED
PICKING → [ESC] → IDLE
SELECTED → [Enter] → PICKING (输出 prompt 后)
SELECTED → [ESC] → PICKING (取消对话框)
```

**替代方案**:
- 使用 `isActive + isDialogOpen` 两个布尔标志：状态组合复杂，容易产生冲突

### 2. 对话框定位：智能候选位置算法

**决策**: 复用现有的 `calculateLabelPosition` 算法模式，优先尝试外部位置，都放不下时放元素内部左上角。

**候选位置优先级**:
1. 右上: 元素右侧，垂直对齐顶部
2. 右下: 元素右侧，垂直对齐底部
3. 左上: 元素左侧，垂直对齐顶部
4. 左下: 元素左侧，垂直对齐底部
5. 元素内左上角（回退位置）

**理由**:
- **避免遮挡**: 优先放在外部，不影响用户查看选中元素
- **适应性强**: 无论元素在屏幕何处，都能找到合适位置
- **回退策略**: 元素内部左上角适合大元素（如 hero section）

**尺寸估算**:
- 对话框宽度: 300px（比信息标签宽，容纳完整 prompt）
- 对话框高度: 120px（输入框 + 提示文字）
- 间距（gap）: 12px

**视口检查逻辑**:
```typescript
for (const pos of candidates) {
  if (pos.x >= 0 && pos.x + dialogWidth <= viewport.width &&
      pos.y >= 0 && pos.y + dialogHeight <= viewport.height) {
    return pos;  // 找到合适的候选位置
  }
}
return {x: rect.left, y: rect.top};  // 回退到元素内左上角
```

**替代方案**:
- 固定在屏幕底部中央：简单但失去了与选中元素的视觉关联

### 3. 对话框交互：无按钮，纯快捷键操作

**决策**: 对话框仅包含输入框和提示文字，无提交/取消按钮，通过 Enter 和 ESC 操作。

**理由**:
- **简洁高效**: 减少视觉噪音，符合键盘操作习惯
- **避免点击**: 用户手已在键盘上（输入 prompt），无需切换到鼠标
- **符合模式**: 类似 IDE 的快速操作面板（如 VS Code 的 Command Palette）

**交互流程**:
```
SELECTED 状态:
  - 对话框自动获取焦点
  - 用户输入 prompt
  - 按 Enter → submitAiPrompt() → 输出到 console → 回到 PICKING
  - 按 ESC → cancelAiDialog() → 隐藏对话框 → 回到 PICKING
```

**替代方案**:
- 添加 [提交] [取消] 按钮：增加视觉复杂度，且需要处理点击事件

### 4. SELECTED 状态的事件隔离

**决策**: 在 `handleMouseOver` 和 `handleClick` 中添加状态检查和 `closest()` 防护，确保对话框元素不触发选择器事件。

**实现**:
```typescript
private handleMouseOverImpl(e: MouseEvent): void {
  if (this.state !== 'PICKING') return;  // 只在 PICKING 状态响应

  // 防止对话框元素触发高亮
  if (e.target.closest('.picker-ai-dialog')) return;

  // ... 正常的高亮逻辑
}

private handleClickImpl(e: MouseEvent): void {
  if (this.state !== 'PICKING') return;  // 只在 PICKING 状态响应

  // 防止点击对话框时触发选择
  if (e.target.closest('.picker-ai-dialog')) return;

  // ... 正常的选择逻辑
}
```

**理由**:
- **状态隔离**: SELECTED 状态下禁止选择其他元素
- **元素防护**: 防止对话框内部元素（输入框、提示文字）触发事件
- **用户体验**: 用户必须先取消对话框（ESC）才能重新选择

**替代方案**:
- 使用 `stopPropagation()` 在对话框元素上阻止事件冒泡：需要在每个对话框子元素上绑定，代码分散

### 5. 对话框样式：内联 CSS + pointer-events: auto

**决策**: 对话框使用内联 CSS 样式，设置 `pointer-events: auto` 允许交互。

**样式设计**:
```typescript
this.aiDialog.style.cssText = `
  position: absolute;
  pointer-events: auto;  // 关键：允许用户点击和输入
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 2147483642;  // 比高亮层（2147483640）和标签（2147483641）更高
  min-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;
```

**输入框样式**:
```typescript
this.dialogInput.style.cssText = `
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  background: #2d2d2d;
  color: #d4d4d4;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;  // 确保 padding 不增加宽度
`;

// Focus 状态
this.dialogInput.addEventListener('focus', () => {
  this.dialogInput.style.borderColor = '#2196F3';
});
```

**理由**:
- **样式隔离**: 内联 CSS 不受页面样式影响
- **交互必需**: `pointer-events: auto` 覆盖继承的 `none`（从覆盖层容器）
- **视觉一致**: 复用现有的高亮层和标签的视觉风格（深色背景、圆角、阴影）

**替代方案**:
- 使用 CSS 类注入样式表：需要管理样式表的生命周期，内联 CSS 更简单

### 6. 信息标签的显示策略

**决策**: SELECTED 状态下隐藏信息标签，只显示高亮层和 AI 对话框。

**实现**:
```typescript
private showAiDialog(target: HTMLElement): void {
  // 隐藏信息标签
  if (this.infoLabel) {
    this.infoLabel.style.display = 'none';
  }

  // 显示对话框
  // ...
}

private hideAiDialog(): void {
  // 移除对话框
  this.aiDialog?.remove();
  this.aiDialog = null;

  // 信息标签在下次 mouseover 时自动显示
}
```

**理由**:
- **避免冗余**: 信息标签（元素类型、尺寸）与对话框（用户输入）功能重复
- **减少遮挡**: 只显示一个浮动元素，减少对页面的遮挡
- **状态清晰**: 对话框本身就是"选中"的视觉提示

**替代方案**:
- 同时显示信息标签和对话框：增加视觉噪音，可能导致对话框位置冲突

## Risks / Trade-offs

### Risk 1: 对话框可能被页面样式覆盖

**风险**: 某些页面可能使用超高 z-index 覆盖对话框。

**缓解措施**:
- 使用 `z-index: 2147483642`（比现有覆盖层更高）
- 对话框样式全部使用 `!important` 确保优先级
- 测试主流网站（如 GitHub、Twitter、电商平台）验证可见性

### Risk 2: 对话框输入框可能被页面 JavaScript 聚焦或修改

**风险**: 页面的自动聚焦脚本或输入增强工具可能影响对话框输入框。

**缓解措施**:
- 使用唯一的 CSS 类名（`.picker-ai-dialog`）降低冲突概率
- MVP 阶段接受此风险，后续可添加事件监听器保护焦点
- 如果问题严重，可考虑 Shadow DOM 隔离（但增加复杂度）

### Risk 3: 快速切换状态可能导致内存泄漏

**风险**: 用户快速点击多个元素并取消，可能创建多个对话框 DOM 元素未清理。

**缓解措施**:
- 在 `showAiDialog()` 中先检查并移除已存在的对话框
- 在 `cleanup()` 中确保移除对话框
- 使用 `?` 可选链和 `null` 检查避免重复引用

### Risk 4: 页面滚动时对话框位置固定，可能偏离选中元素

**风险**: 用户滚动页面后，对话框位置不再对应选中元素。

**缓解措施**:
- MVP 阶段不处理滚动（设计目标）
- 在对话框提示文字中说明"按 ESC 取消"，引导用户快速操作
- 未来可添加 `scroll` 事件监听器更新位置（性能优化）

### Risk 5: 用户可能混淆 ESC 的行为（PICKING vs SELECTED）

**风险**: PICKING 状态按 ESC 退出选择器，SELECTED 状态按 ESC 取消对话框，行为不同。

**缓解措施**:
- 在对话框中显示提示文字："按 Enter 提交，ESC 取消"
- 未来可考虑统一 ESC 行为（都回到 PICKING 状态）
- 通过视觉反馈（对话框出现）明确当前状态

## Migration Plan

### 部署步骤

1. **第一阶段: 扩展状态管理**
   - 修改 `ElementPicker` 类，将 `isActive` 替换为 `state: PickerState`
   - 添加 `PickerState` 类型定义：`type PickerState = 'IDLE' | 'PICKING' | 'SELECTED'`
   - 更新所有使用 `this.isActive` 的地方为状态检查

2. **第二阶段: 实现对话框 DOM 元素**
   - 添加 `aiDialog` 和 `dialogInput` 属性
   - 实现 `createAiDialog()` 方法创建对话框结构
   - 实现 `calculateDialogPosition()` 方法计算对话框位置

3. **第三阶段: 更新事件处理逻辑**
   - 修改 `handleMouseOverImpl` 添加状态检查和 `closest()` 防护
   - 修改 `handleClickImpl` 添加状态检查和 `closest()` 防护
   - 修改 `handleKeyDownImpl` 支持三种状态的键盘事件

4. **第四阶段: 实现对话框交互方法**
   - 实现 `showAiDialog(target)` 显示对话框并隐藏信息标签
   - 实现 `hideAiDialog()` 清理对话框 DOM 元素
   - 实现 `submitAiPrompt()` 输出 prompt 和元素信息到 console
   - 实现 `cancelAiDialog()` 取消对话框并返回 PICKING 状态

5. **第五阶段: 更新清理逻辑**
   - 修改 `cleanup()` 确保移除对话框 DOM 元素
   - 清空 `aiDialog` 和 `dialogInput` 引用

6. **第六阶段: 测试验证**
   - 在 Chrome 和 Firefox 中测试完整流程
   - 验证状态转换正确（IDLE → PICKING → SELECTED → PICKING → IDLE）
   - 验证对话框定位在各种屏幕尺寸和元素位置下正常工作
   - 验证快捷键（Enter、ESC）在所有状态下正确响应

### 回滚策略

- **低风险**: 此功能是纯新增功能，不影响现有选择器核心逻辑
- **可禁用**: 如果发现问题，可以回滚 `elementPicker.ts` 到旧版本
- **向后兼容**: 不涉及消息类型或 API 变更，不会影响其他模块

## Open Questions

无（所有技术决策已在探索阶段确定）

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    ElementPicker                        │
│                                                         │
│  state: PickerState = 'IDLE' | 'PICKING' | 'SELECTED'  │
│  selectedElement: HTMLElement | null                   │
│  currentElement: HTMLElement | null                    │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 高亮覆盖层   │  │  信息标签     │  │  AI 对话框    │  │
│  │ (可选)      │  │  (可选)       │  │  (可选)       │  │
│  │ z-index:    │  │  z-index:    │  │  z-index:    │  │
│  │ 2147483640  │  │  2147483641  │  │  2147483642  │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘

状态 → 可见元素映射：
IDLE    → (无)
PICKING → 高亮覆盖层 + 信息标签
SELECTED → 高亮覆盖层 + AI 对话框 (无信息标签)

事件流：
PICKING:
  mouseover → updateOverlay() → 高亮当前元素 + 显示信息标签
  click → handleClickImpl() → state = SELECTED → showAiDialog()
  keydown(ESC) → stop() → state = IDLE

SELECTED:
  mouseover → (忽略，状态检查)
  click → (忽略，状态检查)
  keydown(Enter) → submitAiPrompt() → console.log → state = PICKING
  keydown(ESC) → cancelAiDialog() → hideAiDialog() → state = PICKING
```

## Implementation Notes

### 关键实现细节

1. **状态类型定义**:
   ```typescript
   type PickerState = 'IDLE' | 'PICKING' | 'SELECTED';
   ```

2. **对话框 DOM 结构**:
   ```typescript
   private createAiDialog(): void {
     // 创建容器
     this.aiDialog = document.createElement('div');
     this.aiDialog.className = 'picker-ai-dialog';
     // ... 样式设置

     // 创建标题
     const title = document.createElement('div');
     title.textContent = '如何调整此元素?';
     title.style.cssText = `font-size: 14px; margin-bottom: 8px; color: #d4d4d4;`;

     // 创建输入框
     this.dialogInput = document.createElement('input');
     this.dialogInput.type = 'text';
     this.dialogInput.placeholder = '描述你想要的调整（如：把按钮改成红色）';
     // ... 样式设置

     // 创建提示文字
     const hint = document.createElement('div');
     hint.textContent = '按 Enter 提交，ESC 取消';
     hint.style.cssText = `font-size: 12px; color: #888; margin-top: 6px;`;

     // 组装
     this.aiDialog.appendChild(title);
     this.aiDialog.appendChild(this.dialogInput);
     this.aiDialog.appendChild(hint);

     // 添加到覆盖层容器
     this.overlayContainer?.appendChild(this.aiDialog);
   }
   ```

3. **显示对话框**:
   ```typescript
   private showAiDialog(target: HTMLElement): void {
     if (!this.aiDialog) {
       this.createAiDialog();
     }

     // 隐藏信息标签
     if (this.infoLabel) {
       this.infoLabel.style.display = 'none';
     }

     // 计算对话框位置
     const rect = target.getBoundingClientRect();
     const pos = this.calculateDialogPosition(rect);

     // 更新对话框位置
     this.aiDialog.style.display = 'block';
     this.aiDialog.style.left = `${pos.x}px`;
     this.aiDialog.style.top = `${pos.y}px`;

     // 自动聚焦输入框
     this.dialogInput?.focus();

     // 保存选中元素引用
     this.selectedElement = target;
   }
   ```

4. **隐藏对话框**:
   ```typescript
   private hideAiDialog(): void {
     if (this.aiDialog) {
       this.aiDialog.remove();
       this.aiDialog = null;
     }
     this.dialogInput = null;
     this.selectedElement = null;

     // 信息标签在下次 mouseover 时自动显示
   }
   ```

5. **提交 prompt**:
   ```typescript
   private submitAiPrompt(): void {
     const prompt = this.dialogInput?.value || '';

     console.log('[ElementPicker] AI Prompt:', prompt);
     console.log('[ElementPicker] 选中元素:', this.getElementInfo(this.selectedElement));

     // TODO: 下一阶段实现 AI 交互

     this.hideAiDialog();
     this.state = 'PICKING';
   }
   ```

6. **取消对话框**:
   ```typescript
   private cancelAiDialog(): void {
     this.hideAiDialog();
     this.state = 'PICKING';
   }
   ```

7. **更新键盘事件处理**:
   ```typescript
   private handleKeyDownImpl(e: KeyboardEvent): void {
     if (this.state === 'PICKING' && e.key === 'Escape') {
       e.preventDefault();
       e.stopPropagation();
       this.stop();
       return;
     }

     if (this.state === 'SELECTED') {
       if (e.key === 'Escape') {
         e.preventDefault();
         e.stopPropagation();
         this.cancelAiDialog();
         return;
       }

       if (e.key === 'Enter') {
         e.preventDefault();
         e.stopPropagation();
         this.submitAiPrompt();
         return;
       }
     }
   }
   ```

8. **辅助方法：获取元素信息**:
   ```typescript
   private getElementInfo(element: HTMLElement | null): any {
     if (!element) return null;

     const rect = element.getBoundingClientRect();
     return {
       tagName: element.tagName,
       id: element.id || undefined,
       className: element.className || undefined,
       dimensions: {
         width: Math.round(rect.width),
         height: Math.round(rect.height),
       },
       textContent: element.textContent?.slice(0, 50) || undefined,
     };
   }
   ```

### 测试策略

1. **状态转换测试**:
   - 启动选择器 → state 应为 PICKING
   - 点击元素 → state 应为 SELECTED，对话框显示
   - 按 Enter → 输出到 console，state 应为 PICKING
   - 按 ESC → 对话框隐藏，state 应为 PICKING
   - 再次按 ESC → state 应为 IDLE

2. **对话框定位测试**:
   - 选中屏幕四角的元素 → 对话框应放在合适位置
   - 选中屏幕中央的小元素 → 对话框应放在外部
   - 选中屏幕中央的大元素（如 hero section）→ 对话框应放在内部左上角

3. **事件隔离测试**:
   - SELECTED 状态下鼠标悬浮其他元素 → 不应高亮
   - SELECTED 状态下点击其他元素 → 不应触发选择
   - 点击对话框本身 → 不应触发选择器事件

4. **快捷键测试**:
   - SELECTED 状态按 Enter → console 应输出 prompt
   - SELECTED 状态按 ESC → 对话框应隐藏，回到 PICKING
   - 输入框为空时按 Enter → 应正常处理（空字符串）

5. **跨浏览器测试**:
   - Chrome 和 Firefox 中验证功能一致性
   - 验证 z-index 在不同浏览器中正确工作
