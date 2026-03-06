# Design: 样式上下文感知的 AI DOM 修改功能

## Context

当前 AI DOM 修改功能（`ai-dom-modification`）已经实现了基础的 AI 驱动元素修改能力。用户可以通过自然语言描述想要的修改，系统调用 AI 模型生成结构化的修改指令并自动应用到页面。

**当前实现限制**：
- `extractElementInfo` 只提取 11 个基础 CSS 属性
- AI 模型只能看到目标元素自身的样式，无法理解页面整体设计风格
- 当用户使用模糊指令时（如"让这个更现代"），AI 往往生成与页面风格不协调的修改
- 缺少元素层级关系信息，无法理解"和那个按钮一样"的指令

**项目约束**：
- Content Script 必须打包为 IIFE（不能使用 ES Module）
- 需要支持 Chrome 和 Firefox 浏览器
- 使用 webextension-polyfill 确保跨浏览器兼容性
- 遵循 TypeScript 严格类型检查

## Goals / Non-Goals

**Goals:**
1. 为 AI 模型提供完整的样式上下文，使其能够理解页面设计系统
2. 实现智能触发机制，明确指令保持高性能，模糊指令提供深度分析
3. 支持层级关系分析，让 AI 理解元素在页面中的位置和角色
4. 自动推断页面设计系统（配色、字体、间距、圆角、阴影）
5. 向后兼容现有功能，不破坏明确的修改指令

**Non-Goals:**
- 不实现撤销/重做功能
- 不保存修改历史
- 不支持多元素批量操作的样式协调
- 不分析动态样式（如通过 JavaScript 修改的样式）
- 不分析响应式断点相关的样式

## Decisions

### 决策 1：三阶段渐进式实现

**选择理由**：
- 阶段 1（扩展样式属性）可以立即见效，实现简单
- 阶段 2（层级上下文）解决"和那个一样"的常见场景
- 阶段 3（设计系统分析）最大化提升模糊指令的质量
- 渐进式实现降低风险，每个阶段都可以独立验证

**实现方案**：

```
阶段 1：扩展 ElementInfo 的 computedStyles
- 从 11 个属性扩展到 50+ 个属性
- 涵盖：颜色、排版、布局、尺寸、边框、视觉效果、交互
- 性能影响：<10ms
```

```
阶段 2：添加层级上下文
- parentContext: 父元素的标签、类名、样式
- siblingContext: 相似兄弟元素的样式和相似度
- 相似度计算：比较 8 个关键样式属性
- 性能影响：~30ms
```

```
阶段 3：设计系统分析
- colorPalette: 扫描按钮、链接、卡片提取配色
- typography: 分析字体家族、字号、字重、行高
- spacing: 提取常用间距值，推断基础单位
- borderRadius: 识别常用圆角值
- boxShadow: 提取阴影模式
- 性能影响：~100ms
```

### 决策 2：智能触发机制

**选择理由**：
- 明确指令（如"改颜色"）不需要深度分析，避免性能浪费
- 模糊指令（如"更现代"）才需要完整上下文
- 用户响应时间敏感，避免不必要的延迟

**实现方案**：

```typescript
private isFuzzyPrompt(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();

  // 明确的属性关键词
  const specificKeywords = [
    '颜色', '背景', '字体', '大小', '边距', '圆角',
    'border', 'color', 'font', 'padding', 'margin',
    '删除', '隐藏', '显示', '添加',
  ];

  // 模糊的目标关键词
  const fuzzyKeywords = [
    '现代', '时尚', '简洁', '优雅', '专业',
    '更好', '更美', '更协调', '优化', '改进',
    'modern', 'elegant', 'minimal',
  ];

  const hasSpecific = specificKeywords.some(kw => lowerPrompt.includes(kw));
  const hasFuzzy = fuzzyKeywords.some(kw => lowerPrompt.includes(kw));

  // 如果有明确的属性修改，不算模糊
  if (hasSpecific && !hasFuzzy) return false;

  return hasFuzzy;
}
```

### 决策 3：设计系统分析的采样策略

**选择理由**：
- 扫描整个页面 DOM 树性能开销太大
- 采样常见元素类型可以代表设计系统
- 限制采样数量避免数据量爆炸

**实现方案**：

```typescript
// 配色分析：扫描常见元素
const buttons = document.querySelectorAll('button, [role="button"], .btn');
const links = document.querySelectorAll('a, [role="link"]');
const cards = document.querySelectorAll('.card, [class*="card"]');

// 字体分析：扫描前 20 个文本元素
const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');

// 间距分析：扫描前 20 个容器元素
const elements = document.querySelectorAll('div, button, .card, section');

// 兄弟元素：只看前 5 个，相似度 > 0.3
const siblings = Array.from(parent.children)
  .filter((child) => child !== element)
  .slice(0, 5);
```

### 决策 4：扩展 ElementInfo 类型而非创建新类型

**选择理由**：
- 向后兼容，现有代码无需修改
- 可选字段允许渐进式采用
- 避免维护两套类型定义

**实现方案**：

```typescript
export interface ElementInfo {
  // === 基础信息（现有）===
  tagName: string;
  id?: string;
  className?: string;
  outerHTML: string;
  textContent?: string;
  computedStyles: Record<string, string>;

  // === 阶段2+：可选的层级上下文 ===
  parentContext?: {
    tagName: string;
    className?: string;
    computedStyles: Record<string, string>;
  };
  siblingContext?: Array<{
    tagName: string;
    className?: string;
    computedStyles: Record<string, string>;
    similarity: number;
  }>;

  // === 阶段3：可选的设计系统 ===
  pageDesignSystem?: {
    colorPalette: ColorPalette;
    typography: TypographySystem;
    spacing: SpacingSystem;
    borderRadius: BorderRadiusSystem;
    boxShadow: BoxShadowSystem;
  };
}
```

### 决策 5：样式相似度计算算法

**选择理由**：
- 需要量化元素间的样式相似性
- 使用关键样式属性而非全部属性
- 归一化到 0-1 范围，便于排序和过滤

**实现方案**：

```typescript
private calculateSimilarity(
  elem1: HTMLElement,
  elem2: HTMLElement
): number {
  const style1 = window.getComputedStyle(elem1);
  const style2 = window.getComputedStyle(elem2);

  // 比较关键样式属性（视觉感知最重要）
  const keyProps = [
    'display', 'color', 'backgroundColor',
    'fontSize', 'fontWeight', 'borderRadius',
    'padding', 'margin'
  ];

  let matchCount = 0;
  keyProps.forEach((prop) => {
    if (style1.getPropertyValue(prop) === style2.getPropertyValue(prop)) {
      matchCount++;
    }
  });

  return matchCount / keyProps.length;
}
```

### 决策 6：颜色去重和规范化

**选择理由**：
- 不同元素可能使用相同颜色但格式不同（rgb、rgba、hex）
- 需要去重避免配色方案冗余
- 浏览器会自动规范化颜色值，利用这一特性

**实现方案**：

```typescript
private deduplicateColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const color of colors) {
    // 利用浏览器自动规范化颜色
    const normalized = this.normalizeColor(color);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(color);
    }
  }

  return result;
}

private normalizeColor(color: string): string {
  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.appendChild(temp);
  const computed = window.getComputedStyle(temp).color;
  document.body.removeChild(temp);
  return computed;
}
```

## Risks / Trade-offs

### 风险 1：性能开销

**描述**：阶段 3 的设计系统分析需要扫描大量 DOM 元素，可能导致页面卡顿。

**缓解措施**：
- 只在模糊指令时触发深度分析
- 限制采样数量（按钮、卡片等最多扫描 20 个）
- 使用 `querySelectorAll` 而非遍历 DOM 树
- 可选优化：实现设计系统缓存（同一页面只分析一次）

### 风险 2：AI Token 消耗增加

**描述**：扩展的上下文信息会显著增加 prompt 长度，可能导致 API 成本上升。

**缓解措施**：
- 明确指令不包含设计系统信息（~5KB → ~5KB）
- 模糊指令才包含完整上下文（~5KB → ~15KB）
- 优化格式化，只展示关键样式属性
- 在 formatStyles 中过滤空值和默认值

### 风险 3：样式分析准确性

**描述**：自动推断的设计系统可能不够准确，影响 AI 的判断。

**缓解措施**：
- 使用多元采样（按钮、链接、卡片、标题等）
- 统计频率最高的样式值作为代表
- 去重和规范化避免重复值
- 提供"手动指定样式"的降级方案（用户可以明确说要什么）

### 风险 4：复杂页面的分析时间

**描述**：某些复杂页面（如大型 SPA）可能有数千个元素，扫描时间过长。

**缓解措施**：
- 严格限制采样数量（每种元素类型最多 20 个）
- 使用 CSS 选择器而非遍历（更高效）
- 超时保护：分析超过 200ms 则停止并返回部分结果

### 风险 5：跨浏览器兼容性

**描述**：某些 CSS 属性在不同浏览器中格式可能不同。

**缓解措施**：
- 使用 `getComputedStyle`，浏览器会自动规范化
- 利用 webextension-polyfill 处理 API 差异
- 在 Chrome 和 Firefox 上分别测试
- 类型定义确保所有属性都是字符串（避免数值精度问题）

## Migration Plan

### 阶段 1：扩展样式属性（1-2 小时）

1. 修改 `source/types/operations.ts`：扩展 ElementInfo 接口（可选字段）
2. 修改 `source/ContentScript/elementPicker.ts`：
   - 扩展 `extractElementInfo` 方法的样式属性列表
   - 测试性能影响（应在 <10ms）

### 阶段 2：添加层级上下文（2-3 小时）

1. 实现父元素提取方法 `extractParentContext`
2. 实现兄弟元素提取方法 `extractSiblingContext`
3. 实现相似度计算方法 `calculateSimilarity`
4. 修改 `extractElementInfo` 支持上下文提取参数
5. 更新 `buildPrompt` 方法格式化上下文信息
6. 测试常见场景（"和那个一样"指令）

### 阶段 3：设计系统分析（4-5 小时）

1. 创建 `source/utils/styleAnalyzer.ts`
2. 实现配色分析 `analyzeColorPalette`
3. 实现字体系统分析 `analyzeTypographySystem`
4. 实现间距系统分析 `analyzeSpacingSystem`
5. 实现圆角系统分析 `analyzeBorderRadiusSystem`
6. 实现阴影系统分析 `analyzeBoxShadowSystem`
7. 集成到 `extractElementInfo`
8. 更新 `buildPrompt` 包含设计系统信息
9. 性能测试和优化

### 阶段 4：智能触发和集成（1-2 小时）

1. 实现 `isFuzzyPrompt` 方法
2. 修改 `submitAiPrompt` 根据模糊度选择分析深度
3. 端到端测试（明确指令 vs 模糊指令）
4. 跨浏览器测试（Chrome + Firefox）

### 回滚策略

- 所有新增字段都是可选的，不影响现有功能
- 如果性能问题，可以通过调整采样数量快速缓解
- 如果效果不佳，可以禁用阶段 2 和 3，只保留阶段 1

## Open Questions

1. **设计系统缓存**：是否需要在 Content Script 中缓存设计系统分析结果？
   - 考虑：同一页面用户可能多次选择不同元素
   - 权衡：缓存实现复杂度 vs 性能提升

2. **相似度阈值**：`0.3` 的相似度阈值是否合适？
   - 需要通过实际测试调整
   - 可以考虑让用户配置

3. **采样数量**：20 个元素的采样数量是否足够？
   - 对于复杂页面可能不足
   - 可以考虑动态调整（页面元素越多，采样比例越小）

4. **用户反馈**：是否需要在 UI 中提示用户正在分析页面样式？
   - 考虑在 loading 状态中显示"正在分析页面设计..."
   - 提升用户体验，避免困惑
