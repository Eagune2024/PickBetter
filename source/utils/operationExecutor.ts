/**
 * Operation Executor
 *
 * 执行AI生成的DOM操作指令
 * 包含验证和执行逻辑，确保安全性和正确性
 */

import type {
  Operation,
  SetStyleOperation,
  AddClassOperation,
  RemoveClassOperation,
  SetTextOperation,
  SetAttributeOperation,
  RemoveAttributeOperation,
  InsertChildOperation,
  RemoveChildOperation,
  ExecutionResult,
} from '../types/operations';

/**
 * 操作执行器类
 */
export class OperationExecutor {
  /**
   * 批量执行操作
   *
   * @param element - 目标HTML元素
   * @param operations - 操作数组
   * @returns 执行结果
   */
  async execute(
    element: HTMLElement,
    operations: unknown[]
  ): Promise<ExecutionResult> {
    const successfulOperations: Operation[] = [];
    const failedOperations: Array<{operation: Operation; error: string}> = [];

    for (const op of operations) {
      // 验证操作格式
      const validation = this.validate(op);
      if (!validation.valid) {
        failedOperations.push({
          operation: op as Operation,
          error: validation.error || '验证失败',
        });
        console.error('[OperationExecutor] 操作验证失败:', validation.error);
        continue;
      }

      // 执行操作
      try {
        await this.applyOperation(element, op as Operation);
        successfulOperations.push(op as Operation);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        failedOperations.push({
          operation: op as Operation,
          error: errorMessage,
        });
        console.error('[OperationExecutor] 操作执行失败:', errorMessage);
      }
    }

    return {
      successfulOperations,
      failedOperations,
    };
  }

  /**
   * 验证操作
   *
   * @param op - 待验证的操作
   * @returns 验证结果
   */
  private validate(op: unknown): {valid: boolean; error?: string} {
    if (!op || typeof op !== 'object') {
      return {valid: false, error: '操作必须是对象'};
    }

    const operation = op as {operation?: string};

    if (!operation.operation) {
      return {valid: false, error: '缺少operation字段'};
    }

    switch (operation.operation) {
      case 'setStyle':
        return this.validateSetStyle(op as SetStyleOperation);
      case 'addClass':
        return this.validateAddClass(op as AddClassOperation);
      case 'removeClass':
        return this.validateRemoveClass(op as RemoveClassOperation);
      case 'setText':
        return {valid: true};
      case 'setAttribute':
        return this.validateSetAttribute(op as SetAttributeOperation);
      case 'removeAttribute':
        return this.validateRemoveAttribute(op as RemoveAttributeOperation);
      case 'insertChild':
        return this.validateInsertChild(op as InsertChildOperation);
      case 'removeChild':
        return this.validateRemoveChild(op as RemoveChildOperation);
      default:
        return {
          valid: false,
          error: `不支持的操作类型: ${operation.operation}`,
        };
    }
  }

  /**
   * 验证setStyle操作
   */
  private validateSetStyle(op: SetStyleOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.property || typeof op.property !== 'string') {
      return {valid: false, error: '缺少或无效的property字段'};
    }

    if (!Validator.isValidCSSProperty(op.property)) {
      return {valid: false, error: `不支持的CSS属性: ${op.property}`};
    }

    if (op.value === undefined || typeof op.value !== 'string') {
      return {valid: false, error: '缺少或无效的value字段'};
    }

    if (Validator.containsDangerousPatterns(op.value)) {
      return {valid: false, error: 'CSS值包含危险模式'};
    }

    return {valid: true};
  }

  /**
   * 验证addClass操作
   */
  private validateAddClass(op: AddClassOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.className || typeof op.className !== 'string') {
      return {valid: false, error: '缺少或无效的className字段'};
    }

    if (!Validator.isValidClassName(op.className)) {
      return {valid: false, error: `无效的类名格式: ${op.className}`};
    }

    return {valid: true};
  }

  /**
   * 验证removeClass操作
   */
  private validateRemoveClass(op: RemoveClassOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.className || typeof op.className !== 'string') {
      return {valid: false, error: '缺少或无效的className字段'};
    }

    if (!Validator.isValidClassName(op.className)) {
      return {valid: false, error: `无效的类名格式: ${op.className}`};
    }

    return {valid: true};
  }

  /**
   * 验证setAttribute操作
   */
  private validateSetAttribute(op: SetAttributeOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.name || typeof op.name !== 'string') {
      return {valid: false, error: '缺少或无效的name字段'};
    }

    if (Validator.isEventAttribute(op.name)) {
      return {valid: false, error: '不允许设置事件处理器属性'};
    }

    if (!Validator.isValidHTMLAttribute(op.name)) {
      return {valid: false, error: `不支持的属性: ${op.name}`};
    }

    if (op.value === undefined) {
      return {valid: false, error: '缺少value字段'};
    }

    if (
      typeof op.value === 'string' &&
      Validator.containsDangerousPatterns(op.value)
    ) {
      return {valid: false, error: '属性值包含危险模式'};
    }

    return {valid: true};
  }

  /**
   * 验证removeAttribute操作
   */
  private validateRemoveAttribute(op: RemoveAttributeOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.name || typeof op.name !== 'string') {
      return {valid: false, error: '缺少或无效的name字段'};
    }

    if (Validator.isEventAttribute(op.name)) {
      return {valid: false, error: '不允许移除事件处理器属性'};
    }

    if (!Validator.isValidHTMLAttribute(op.name)) {
      return {valid: false, error: `不支持的属性: ${op.name}`};
    }

    return {valid: true};
  }

  /**
   * 验证insertChild操作
   */
  private validateInsertChild(op: InsertChildOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.html || typeof op.html !== 'string') {
      return {valid: false, error: '缺少或无效的html字段'};
    }

    if (!Validator.isValidHTML(op.html)) {
      return {valid: false, error: 'HTML包含危险内容'};
    }

    if (
      !op.position ||
      !['append', 'prepend', 'before', 'after'].includes(op.position)
    ) {
      return {valid: false, error: '无效的position字段'};
    }

    return {valid: true};
  }

  /**
   * 验证removeChild操作
   */
  private validateRemoveChild(op: RemoveChildOperation): {
    valid: boolean;
    error?: string;
  } {
    if (!op.selector || typeof op.selector !== 'string') {
      return {valid: false, error: '缺少或无效的selector字段'};
    }

    return {valid: true};
  }

  /**
   * 应用单个操作
   *
   * @param element - 目标HTML元素
   * @param operation - 操作
   */
  private async applyOperation(
    element: HTMLElement,
    operation: Operation
  ): Promise<void> {
    switch (operation.operation) {
      case 'setStyle':
        this.applySetStyle(element, operation);
        break;
      case 'addClass':
        this.applyAddClass(element, operation);
        break;
      case 'removeClass':
        this.applyRemoveClass(element, operation);
        break;
      case 'setText':
        this.applySetText(element, operation);
        break;
      case 'setAttribute':
        this.applySetAttribute(element, operation);
        break;
      case 'removeAttribute':
        this.applyRemoveAttribute(element, operation);
        break;
      case 'insertChild':
        this.applyInsertChild(element, operation);
        break;
      case 'removeChild':
        this.applyRemoveChild(element, operation);
        break;
    }
  }

  /**
   * 应用setStyle操作
   */
  private applySetStyle(
    element: HTMLElement,
    operation: SetStyleOperation
  ): void {
    element.style[operation.property] = operation.value;
  }

  /**
   * 应用addClass操作
   */
  private applyAddClass(
    element: HTMLElement,
    operation: AddClassOperation
  ): void {
    element.classList.add(operation.className);
  }

  /**
   * 应用removeClass操作
   */
  private applyRemoveClass(
    element: HTMLElement,
    operation: RemoveClassOperation
  ): void {
    element.classList.remove(operation.className);
  }

  /**
   * 应用setText操作
   */
  private applySetText(
    element: HTMLElement,
    operation: SetTextOperation
  ): void {
    element.textContent = operation.text;
  }

  /**
   * 应用setAttribute操作
   */
  private applySetAttribute(
    element: HTMLElement,
    operation: SetAttributeOperation
  ): void {
    element.setAttribute(operation.name, operation.value);
  }

  /**
   * 应用removeAttribute操作
   */
  private applyRemoveAttribute(
    element: HTMLElement,
    operation: RemoveAttributeOperation
  ): void {
    element.removeAttribute(operation.name);
  }

  /**
   * 应用insertChild操作
   */
  private applyInsertChild(
    element: HTMLElement,
    operation: InsertChildOperation
  ): void {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = operation.html;
    const newElement = tempDiv.firstChild;

    if (!newElement) {
      throw new Error('插入的HTML无效');
    }

    switch (operation.position) {
      case 'append':
        element.appendChild(newElement);
        break;
      case 'prepend':
        element.insertBefore(newElement, element.firstChild);
        break;
      case 'before':
        element.parentNode?.insertBefore(newElement, element);
        break;
      case 'after':
        element.parentNode?.insertBefore(newElement, element.nextSibling);
        break;
    }
  }

  /**
   * 应用removeChild操作
   */
  private applyRemoveChild(
    element: HTMLElement,
    operation: RemoveChildOperation
  ): void {
    const child = element.querySelector(operation.selector);
    if (child) {
      child.remove();
    } else {
      console.warn(`未找到选择器匹配的元素: ${operation.selector}`);
    }
  }
}

/**
 * 验证器工具类
 */
class Validator {
  // CSS属性白名单
  private static readonly CSS_WHITELIST = new Set([
    'color',
    'backgroundColor',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'fontFamily',
    'padding',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'border',
    'borderTop',
    'borderBottom',
    'borderLeft',
    'borderRight',
    'borderRadius',
    'borderWidth',
    'borderColor',
    'borderStyle',
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'display',
    'visibility',
    'opacity',
    'position',
    'top',
    'bottom',
    'left',
    'right',
    'zIndex',
    'overflow',
    'textAlign',
    'lineHeight',
    'letterSpacing',
    'textDecoration',
    'cursor',
    'boxShadow',
    'transform',
    'transition',
  ]);

  // HTML属性白名单
  private static readonly ATTR_WHITELIST = new Set([
    'id',
    'class',
    'title',
    'alt',
    'src',
    'href',
    'target',
    'type',
    'name',
    'value',
    'placeholder',
    'disabled',
    'readonly',
    'checked',
    'selected',
    'required',
    'min',
    'max',
    'step',
    'pattern',
    'maxlength',
    'rows',
    'cols',
  ]);

  // 危险模式黑名单
  private static readonly DANGEROUS_PATTERNS = [
    /expression\(/i,
    /javascript:/i,
    /vbscript:/i,
    /data:\s*text\/html/i,
  ];

  /**
   * 检查CSS属性是否有效
   */
  static isValidCSSProperty(prop: string): boolean {
    return this.CSS_WHITELIST.has(prop);
  }

  /**
   * 检查类名是否有效
   */
  static isValidClassName(className: string): boolean {
    const classRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
    return classRegex.test(className);
  }

  /**
   * 检查HTML属性是否有效
   */
  static isValidHTMLAttribute(attr: string): boolean {
    return this.ATTR_WHITELIST.has(attr);
  }

  /**
   * 检查是否是事件属性
   */
  static isEventAttribute(attr: string): boolean {
    return attr.startsWith('on');
  }

  /**
   * 检查是否包含危险模式
   */
  static containsDangerousPatterns(value: string): boolean {
    return this.DANGEROUS_PATTERNS.some((pattern) => pattern.test(value));
  }

  /**
   * 检查HTML是否安全
   */
  static isValidHTML(html: string): boolean {
    // 检测script标签
    if (html.toLowerCase().includes('<script')) {
      return false;
    }

    // 检测事件处理器
    if (/on\w+\s*=/.test(html)) {
      return false;
    }

    // 检测javascript:协议
    if (/javascript:/i.test(html)) {
      return false;
    }

    return true;
  }
}
