/**
 * DOM操作类型定义
 *
 * 定义了所有支持的DOM修改操作类型
 * 包括样式修改、内容修改和结构修改
 */

/**
 * 设置inline样式操作
 */
export interface SetStyleOperation {
  operation: 'setStyle';
  property: string;
  value: string;
}

/**
 * 添加CSS class操作
 */
export interface AddClassOperation {
  operation: 'addClass';
  className: string;
}

/**
 * 移除CSS class操作
 */
export interface RemoveClassOperation {
  operation: 'removeClass';
  className: string;
}

/**
 * 设置文本内容操作
 */
export interface SetTextOperation {
  operation: 'setText';
  text: string;
}

/**
 * 设置HTML属性操作
 */
export interface SetAttributeOperation {
  operation: 'setAttribute';
  name: string;
  value: string;
}

/**
 * 移除HTML属性操作
 */
export interface RemoveAttributeOperation {
  operation: 'removeAttribute';
  name: string;
}

/**
 * 插入子元素操作
 */
export interface InsertChildOperation {
  operation: 'insertChild';
  html: string;
  position: 'append' | 'prepend' | 'before' | 'after';
}

/**
 * 删除子元素操作
 */
export interface RemoveChildOperation {
  operation: 'removeChild';
  selector: string;
}

/**
 * 解释操作（用于AI解释为什么无法执行某操作）
 */
export interface ExplainOperation {
  operation: 'explain';
  reason: string;
}

/**
 * 操作联合类型
 * 包含所有支持的DOM操作
 */
export type Operation =
  | SetStyleOperation
  | AddClassOperation
  | RemoveClassOperation
  | SetTextOperation
  | SetAttributeOperation
  | RemoveAttributeOperation
  | InsertChildOperation
  | RemoveChildOperation
  | ExplainOperation;

/**
 * 操作执行结果
 */
export interface OperationResult {
  success: boolean;
  operation: Operation;
  error?: string;
}

/**
 * 批量操作执行结果
 */
export interface ExecutionResult {
  successfulOperations: Operation[];
  failedOperations: Array<{operation: Operation; error: string}>;
}

/**
 * 父元素信息
 */
export interface ParentElementInfo {
  tagName: string;
  className?: string;
  computedStyles: Record<string, string>;
}

/**
 * 兄弟元素信息
 */
export interface SiblingElementInfo {
  tagName: string;
  className?: string;
  computedStyles: Record<string, string>;
  similarity: number;
}

/**
 * 配色方案
 */
export interface ColorPalette {
  primary: string[];
  secondary: string[];
  background: string[];
  text: string[];
  border: string[];
}

/**
 * 字体系统
 */
export interface TypographySystem {
  fontFamilies: string[];
  fontSizeScale: number[];
  fontWeightScale: number[];
  lineHeights: number[];
}

/**
 * 间距系统
 */
export interface SpacingSystem {
  commonValues: number[];
  rhythmUnit: number;
}

/**
 * 圆角系统
 */
export interface BorderRadiusSystem {
  commonValues: number[];
}

/**
 * 阴影系统
 */
export interface BoxShadowSystem {
  commonPatterns: string[];
}

/**
 * 页面设计系统
 */
export interface PageDesignSystem {
  colorPalette: ColorPalette;
  typography: TypographySystem;
  spacing: SpacingSystem;
  borderRadius: BorderRadiusSystem;
  boxShadow: BoxShadowSystem;
}

/**
 * 元素信息
 * 用于发送给AI的元素描述
 */
export interface ElementInfo {
  // === 基础信息 ===
  tagName: string;
  id?: string;
  className?: string;
  outerHTML: string;
  textContent?: string;
  computedStyles: Record<string, string>;

  // === 阶段2+：可选的层级上下文 ===
  parentContext?: ParentElementInfo;
  siblingContext?: SiblingElementInfo[];

  // === 阶段3：可选的设计系统 ===
  pageDesignSystem?: PageDesignSystem;
}

/**
 * AI响应格式
 */
export interface AIResponse {
  operations: unknown[];
}
