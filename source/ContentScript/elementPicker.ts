/**
 * Element Picker Module
 *
 * Provides a visual element selection capability for the browser extension.
 * Users can activate picker mode, hover over elements to highlight them,
 * and click to select elements (displays AI dialog for prompt input).
 *
 * Usage:
 *   import {startPicker, stopPicker} from './elementPicker';
 *   startPicker();  // Activate picker mode
 *   stopPicker();   // Deactivate picker mode
 */

import browser from 'webextension-polyfill';
import type {ElementInfo} from '../types/operations';
import {OperationExecutor} from '../utils/operationExecutor';

/**
 * Picker state type definition
 * - IDLE: Picker is not active
 * - PICKING: User is selecting an element
 * - SELECTED: Element is selected, AI dialog is displayed
 */
type PickerState = 'IDLE' | 'PICKING' | 'SELECTED';

/**
 * ElementPicker Class
 *
 * Manages the element picker functionality including:
 * - Overlay-based highlighting (no element style pollution)
 * - Smart positioning for info labels
 * - Handling element selection on click
 * - Supporting keyboard shortcuts (ESC to cancel)
 * - Managing event listeners and cleanup
 */
export class ElementPicker {
  private state: PickerState = 'IDLE';
  private currentElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;

  // Overlay DOM elements
  private overlayContainer: HTMLElement | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private infoLabel: HTMLElement | null = null;

  // AI Dialog elements
  private aiDialog: HTMLElement | null = null;
  private dialogInput: HTMLInputElement | null = null;
  private dialogContentBackup: string | null = null; // 备份对话框内容用于恢复

  // Event handlers bound to the instance
  private readonly handleMouseOver: (e: MouseEvent) => void;
  private readonly handleClick: (e: MouseEvent) => void;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleTouchMove: (e: TouchEvent) => void;

  constructor() {
    // Bind event handlers to instance methods
    this.handleMouseOver = this.handleMouseOverImpl.bind(this);
    this.handleClick = this.handleClickImpl.bind(this);
    this.handleKeyDown = this.handleKeyDownImpl.bind(this);
    this.handleWheel = this.handleWheelImpl.bind(this);
    this.handleTouchMove = this.handleTouchMoveImpl.bind(this);
  }

  /**
   * Start the element picker mode
   */
  public start(): void {
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      console.log('[ElementPicker] 选择模式已激活,无需重复启动');
      return;
    }

    this.state = 'PICKING';
    this.createOverlay();
    this.attachEventListeners();
    console.log('[ElementPicker] 选择模式已启动,按ESC退出');
  }

  /**
   * Stop the element picker mode
   */
  public stop(): void {
    if (this.state === 'IDLE') {
      return;
    }

    this.cleanup();
    this.state = 'IDLE';
    console.log('[ElementPicker] 选择模式已退出');
  }

  /**
   * Create overlay DOM elements
   */
  private createOverlay(): void {
    // Create container
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'picker-overlay-root';
    // Use position: fixed so the container is always relative to viewport, not document
    // This ensures getBoundingClientRect() coordinates work correctly when page is scrolled
    this.overlayContainer.style.cssText =
      'position: fixed; top: 0; left: 0; width: 0; height: 0;';

    // Create highlight overlay
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.className = 'picker-highlight';
    this.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: rgba(33, 150, 243, 0.15);
      border: 2px solid #2196F3;
      box-sizing: border-box;
      z-index: 2147483640;
      display: none;
    `;

    // Create info label
    this.infoLabel = document.createElement('div');
    this.infoLabel.className = 'picker-label';
    this.infoLabel.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 6px 10px;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.4;
      border-radius: 3px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 2147483641;
      display: none;
    `;

    // Assemble and append to body
    this.overlayContainer.appendChild(this.highlightOverlay);
    this.overlayContainer.appendChild(this.infoLabel);
    document.body.appendChild(this.overlayContainer);
  }

  /**
   * Create the AI dialog DOM element structure
   *
   * Creates a floating dialog with:
   * - Title: "如何调整此元素?"
   * - Input field for user prompt
   * - Hint text: "按 Enter 提交，ESC 取消"
   *
   * The dialog is styled with inline CSS to ensure it displays correctly
   * on any website, regardless of existing page styles.
   *
   * The dialog is added to the overlay container but remains hidden
   * until showAiDialog() is called.
   */
  private createAiDialog(): void {
    // Create dialog container
    this.aiDialog = document.createElement('div');
    this.aiDialog.className = 'picker-ai-dialog';
    this.aiDialog.style.cssText = `
      position: absolute;
      pointer-events: auto;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 2147483642;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: none;
    `;

    // Create title
    const title = document.createElement('div');
    title.textContent = '如何调整此元素?';
    title.style.cssText = `
      font-size: 14px;
      margin-bottom: 8px;
      color: #d4d4d4;
      font-weight: 500;
    `;

    // Create input
    this.dialogInput = document.createElement('input');
    this.dialogInput.type = 'text';
    this.dialogInput.placeholder = '描述你想要的调整（如：把按钮改成红色）';
    this.dialogInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #3e3e3e;
      border-radius: 4px;
      background: #2d2d2d;
      color: #d4d4d4;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    `;

    // Add focus style
    this.dialogInput.addEventListener('focus', () => {
      if (this.dialogInput) {
        this.dialogInput.style.borderColor = '#2196F3';
      }
    });

    this.dialogInput.addEventListener('blur', () => {
      if (this.dialogInput) {
        this.dialogInput.style.borderColor = '#3e3e3e';
      }
    });

    // Create hint text
    const hint = document.createElement('div');
    hint.textContent = '按 Enter 提交，ESC 取消';
    hint.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-top: 6px;
    `;

    // Assemble dialog
    this.aiDialog.appendChild(title);
    this.aiDialog.appendChild(this.dialogInput);
    this.aiDialog.appendChild(hint);

    // Add to overlay container
    this.overlayContainer?.appendChild(this.aiDialog);
  }

  /**
   * Attach event listeners for picker mode
   */
  private attachEventListeners(): void {
    // Use capture phase to intercept events before page handlers
    document.addEventListener('mouseover', this.handleMouseOver, {
      capture: true,
    });
    document.addEventListener('click', this.handleClick, {capture: true});
    document.addEventListener('keydown', this.handleKeyDown, {
      capture: true,
    });
    // Prevent scrolling when picker is active
    document.addEventListener('wheel', this.handleWheel, {passive: false});
    document.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    });
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    document.removeEventListener('mouseover', this.handleMouseOver, {
      capture: true,
    });
    document.removeEventListener('click', this.handleClick, {
      capture: true,
    });
    document.removeEventListener('keydown', this.handleKeyDown, {
      capture: true,
    });
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('touchmove', this.handleTouchMove);
  }

  /**
   * Handle mouse over events
   */
  private handleMouseOverImpl(e: MouseEvent): void {
    if (this.state !== 'PICKING') return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;

    // Skip if highlighting the same element
    if (this.currentElement === target) return;

    // Prevent dialog element from triggering highlight
    if (target.closest('.picker-ai-dialog')) return;

    // Update current element
    this.currentElement = target;

    // Update overlay
    this.updateOverlay(target);
  }

  /**
   * Handle click events
   */
  private handleClickImpl(e: MouseEvent): void {
    if (this.state !== 'PICKING') return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target as HTMLElement;

    // Prevent dialog element from triggering selection
    if (target.closest('.picker-ai-dialog')) return;

    // Extract and log element information
    const rect = target.getBoundingClientRect();
    const elementInfo = {
      tagName: target.tagName,
      id: target.id || undefined,
      className: target.className || undefined,
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      textContent: target.textContent?.slice(0, 50) || undefined,
    };

    console.log('[ElementPicker] 选中元素:', elementInfo);

    // Transition to SELECTED state and show AI dialog
    this.state = 'SELECTED';
    this.showAiDialog(target);
  }

  /**
   * Handle key down events
   */
  private handleKeyDownImpl(e: KeyboardEvent): void {
    // Block scroll-related keys when picker is active (PICKING or SELECTED)
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      const scrollKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ];

      if (scrollKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // PICKING state: ESC stops the picker
    if (this.state === 'PICKING' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      return;
    }

    // SELECTED state: ESC cancels dialog, Enter submits prompt
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

  /**
   * Handle mouse wheel events
   */
  private handleWheelImpl(e: WheelEvent): void {
    // Block scrolling when picker is active
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Handle touch move events
   */
  private handleTouchMoveImpl(e: TouchEvent): void {
    // Block scrolling when picker is active
    if (this.state === 'PICKING' || this.state === 'SELECTED') {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Update overlay position and content
   */
  private updateOverlay(target: HTMLElement): void {
    if (!this.highlightOverlay || !this.infoLabel) return;

    try {
      const rect = target.getBoundingClientRect();

      // Update highlight overlay
      this.highlightOverlay.style.display = 'block';
      this.highlightOverlay.style.left = `${rect.left}px`;
      this.highlightOverlay.style.top = `${rect.top}px`;
      this.highlightOverlay.style.width = `${rect.width}px`;
      this.highlightOverlay.style.height = `${rect.height}px`;

      // Update info label
      this.infoLabel.style.display = 'block';
      const labelPos = this.calculateLabelPosition(rect);
      this.infoLabel.style.left = `${labelPos.x}px`;
      this.infoLabel.style.top = `${labelPos.y}px`;

      // Update label content
      this.updateLabelContent(target, rect);
    } catch (error) {
      // Element might have been removed from DOM
      console.error('[ElementPicker] Error updating overlay:', error);
    }
  }

  /**
   * Calculate smart position for info label
   */
  private calculateLabelPosition(rect: DOMRect): {x: number; y: number} {
    // Estimate label dimensions
    const labelWidth = 150;
    const labelHeight = 50;
    const gap = 8;

    // Candidate positions: right-top, right-bottom, left-top, left-bottom
    const candidates = [
      {x: rect.right + gap, y: rect.top},
      {x: rect.right + gap, y: rect.bottom - labelHeight},
      {x: rect.left - labelWidth - gap, y: rect.top},
      {x: rect.left - labelWidth - gap, y: rect.bottom - labelHeight},
    ];

    // Viewport dimensions
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Find first position that fits in viewport
    for (const pos of candidates) {
      if (
        pos.x >= 0 &&
        pos.x + labelWidth <= viewport.width &&
        pos.y >= 0 &&
        pos.y + labelHeight <= viewport.height
      ) {
        return pos;
      }
    }

    // Fallback: place inside element at top-left
    return {x: rect.left, y: rect.top};
  }

  /**
   * Calculate optimal position for the AI dialog
   *
   * Uses a smart positioning algorithm that:
   * 1. Tries to place the dialog outside the element (4 candidate positions)
   * 2. Falls back to inside the element if no external position fits
   *
   * Priority order for candidate positions:
   * - Right-top (element right side, aligned with top)
   * - Right-bottom (element right side, aligned with bottom)
   * - Left-top (element left side, aligned with top)
   * - Left-bottom (element left side, aligned with bottom)
   * - Inside element at top-left (fallback)
   *
   * @param rect - The bounding rectangle of the selected element
   * @returns Object with x and y coordinates for dialog placement
   */
  private calculateDialogPosition(rect: DOMRect): {x: number; y: number} {
    // Dialog dimensions
    const dialogWidth = 300;
    const dialogHeight = 120;
    const gap = 12;

    // Candidate positions: right-top, right-bottom, left-top, left-bottom
    const candidates = [
      {x: rect.right + gap, y: rect.top},
      {x: rect.right + gap, y: rect.bottom - dialogHeight},
      {x: rect.left - dialogWidth - gap, y: rect.top},
      {x: rect.left - dialogWidth - gap, y: rect.bottom - dialogHeight},
    ];

    // Viewport dimensions
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Find first position that fits in viewport
    for (const pos of candidates) {
      if (
        pos.x >= 0 &&
        pos.x + dialogWidth <= viewport.width &&
        pos.y >= 0 &&
        pos.y + dialogHeight <= viewport.height
      ) {
        return pos;
      }
    }

    // Fallback: place inside element at top-left
    return {x: rect.left, y: rect.top};
  }

  /**
   * Get element information for console output
   */
  private getElementInfo(element: HTMLElement | null): {
    tagName: string;
    id?: string;
    className?: string;
    dimensions: {width: number; height: number};
    textContent?: string;
  } {
    if (!element) {
      return {
        tagName: '',
        dimensions: {width: 0, height: 0},
      };
    }

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

  /**
   * Update label content with element information
   */
  private updateLabelContent(target: HTMLElement, rect: DOMRect): void {
    if (!this.infoLabel) return;

    const tagName = target.tagName.toLowerCase();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    // First line: tag name and dimensions
    let html = `<span style="color: #569CD6;">${this.escapeHtml(tagName)}</span> `;
    html += `<span style="color: #b5cea8;">${width}x${height}</span>`;

    // Second line: ID and class names (if any)
    if (target.id || target.className) {
      html += '<div>';
      if (target.id) {
        html += `<span style="color: #DCDCAA;">#${this.escapeHtml(target.id)}</span> `;
      }
      if (target.className && typeof target.className === 'string') {
        const classes = target.className
          .split(' ')
          .filter((c) => c)
          .map((c) => `.${this.escapeHtml(c)}`)
          .join(' ');
        if (classes) {
          html += `<span style="color: #CE9178;">${classes}</span>`;
        }
      }
      html += '</div>';
    }

    this.infoLabel.innerHTML = html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show AI dialog for a selected element
   *
   * This method:
   * 1. Creates the dialog if it doesn't exist
   * 2. Hides the info label (to reduce visual clutter)
   * 3. Calculates optimal dialog position
   * 4. Positions and displays the dialog
   * 5. Auto-focuses the input field for immediate typing
   * 6. Saves the selected element reference
   * 7. Transitions state to SELECTED
   *
   * @param target - The HTML element that was selected
   */
  private showAiDialog(target: HTMLElement): void {
    // Create dialog if it doesn't exist
    if (!this.aiDialog) {
      this.createAiDialog();
    }

    // Hide info label
    if (this.infoLabel) {
      this.infoLabel.style.display = 'none';
    }

    // Calculate dialog position
    const rect = target.getBoundingClientRect();
    const pos = this.calculateDialogPosition(rect);

    // Update dialog position and show it
    if (this.aiDialog) {
      this.aiDialog.style.display = 'block';
      this.aiDialog.style.left = `${pos.x}px`;
      this.aiDialog.style.top = `${pos.y}px`;
    }

    // Auto focus input
    this.dialogInput?.focus();

    // Save selected element
    this.selectedElement = target;

    // Set state
    this.state = 'SELECTED';
  }

  /**
   * Hide and clean up the AI dialog
   *
   * Removes the dialog DOM element from the overlay container
   * and clears all related references to prevent memory leaks.
   *
   * The info label is NOT explicitly shown here - it will
   * automatically reappear on the next mouseover event.
   */
  private hideAiDialog(): void {
    // Remove dialog DOM element
    if (this.aiDialog) {
      this.aiDialog.remove();
      this.aiDialog = null;
    }

    // Clear references
    this.dialogInput = null;
    this.selectedElement = null;
  }

  /**
   * Handle AI prompt submission
   *
   * This method is called when the user presses Enter in the dialog:
   * 1. Retrieves the prompt text from the input field
   * 2. Extracts element information
   * 3. Sends request to Background Script
   * 4. Shows loading state
   */
  private async submitAiPrompt(): Promise<void> {
    const prompt = this.dialogInput?.value || '';

    if (!prompt.trim()) {
      return;
    }

    console.log('[ElementPicker] AI Prompt:', prompt);

    // 提取元素信息
    const elementInfo = this.extractElementInfo(this.selectedElement);

    try {
      // 构建并发送请求
      await browser.runtime.sendMessage({
        type: 'REQUEST_AI_MODIFICATION',
        payload: {
          prompt,
          elementInfo,
        },
      });

      console.log('[ElementPicker] 已发送AI请求到Background');

      // 显示loading状态
      this.showLoading();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[ElementPicker] 发送AI请求失败:', errorMessage);
      this.showError('发送请求失败，请重试');
    }
  }

  /**
   * 提取元素信息
   *
   * @param element - HTML元素
   * @returns 元素信息对象
   */
  private extractElementInfo(element: HTMLElement | null): ElementInfo {
    if (!element) {
      return {
        tagName: '',
        outerHTML: '',
        computedStyles: {},
      };
    }

    const computedStyles = window.getComputedStyle(element);

    // 提取常用的CSS属性
    const styleProps = [
      'color',
      'backgroundColor',
      'fontSize',
      'fontWeight',
      'padding',
      'margin',
      'border',
      'borderRadius',
      'width',
      'height',
      'display',
    ];

    const styles: Record<string, string> = {};
    styleProps.forEach((prop) => {
      styles[prop] = computedStyles.getPropertyValue(prop);
    });

    return {
      tagName: element.tagName,
      id: element.id || undefined,
      className: element.className || undefined,
      outerHTML: element.outerHTML.slice(0, 1000), // 截断到1000字符
      textContent: element.textContent?.slice(0, 100), // 截断到100字符
      computedStyles: styles,
    };
  }

  /**
   * 显示loading状态
   */
  private showLoading(): void {
    if (!this.aiDialog) return;

    // 保存当前对话框内容
    this.dialogContentBackup = this.aiDialog.innerHTML;

    // 替换为loading状态
    this.aiDialog.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        min-width: 200px;
      ">
        <div class="picker-spinner" style="
          width: 32px;
          height: 32px;
          border: 3px solid #3e3e3e;
          border-top-color: #2196F3;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        "></div>
        <div style="
          margin-top: 12px;
          font-size: 14px;
          color: #d4d4d4;
        ">AI正在思考...</div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    // 禁用所有交互
    this.aiDialog.style.pointerEvents = 'none';
  }

  /**
   * 隐藏loading状态
   */
  private hideLoading(): void {
    // 恢复对话框内容
    if (this.aiDialog && this.dialogContentBackup) {
      this.aiDialog.innerHTML = this.dialogContentBackup;
      this.aiDialog.style.pointerEvents = 'auto';

      // 重新绑定input元素
      this.dialogInput = this.aiDialog.querySelector(
        'input[type="text"]'
      ) as HTMLInputElement;
    }
  }

  /**
   * 显示成功状态
   */
  private showSuccess(): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style="
        padding: 16px;
        min-width: 280px;
      ">
        <div style="
          font-size: 16px;
          color: #4caf50;
          margin-bottom: 8px;
          font-weight: 500;
        ">✓ 修改成功</div>
        <div style="
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
        ">元素已按照您的要求修改</div>
        <button id="closeSuccessBtn" style="
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #2196F3;
          color: white;
          font-size: 14px;
          cursor: pointer;
        ">继续选择</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeSuccessBtn');
    closeBtn?.addEventListener('click', () => {
      this.hideAiDialog();
      this.state = 'PICKING';
    });
  }

  /**
   * 显示错误状态
   *
   * @param error - 错误消息
   */
  private showError(error: string): void {
    if (!this.aiDialog) return;

    this.aiDialog.innerHTML = `
      <div style="
        padding: 16px;
        min-width: 280px;
      ">
        <div style="
          font-size: 16px;
          color: #f44336;
          margin-bottom: 8px;
          font-weight: 500;
        ">❌ 修改失败</div>
        <div style="
          font-size: 13px;
          color: #d4d4d4;
          margin-bottom: 16px;
          line-height: 1.5;
        ">${this.escapeHtml(error)}</div>
        <button id="closeErrorBtn" style="
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #3e3e3e;
          color: #d4d4d4;
          font-size: 14px;
          cursor: pointer;
        ">关闭</button>
      </div>
    `;

    const closeBtn = this.aiDialog.querySelector('#closeErrorBtn');
    closeBtn?.addEventListener('click', () => {
      this.cancelAiDialog();
    });
  }

  /**
   * 处理应用操作消息
   *
   * @param operations - 操作数组
   */
  private async handleApplyOperations(operations: unknown[]): Promise<void> {
    if (!this.selectedElement) {
      console.error('[ElementPicker] 没有选中的元素');
      this.showError('元素不存在');
      return;
    }

    try {
      const executor = new OperationExecutor();
      const result = await executor.execute(this.selectedElement, operations);

      console.log('[ElementPicker] 操作执行结果:', result);

      if (result.failedOperations.length === 0) {
        // 全部成功
        this.showSuccess();
      } else if (result.successfulOperations.length === 0) {
        // 全部失败
        const error = result.failedOperations[0]?.error || '操作执行失败';
        this.showError(error);
      } else {
        // 部分成功
        const failedCount = result.failedOperations.length;
        this.showSuccess();
        console.warn(`[ElementPicker] ${failedCount} 个操作失败，已跳过`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[ElementPicker] 执行操作失败:', errorMessage);
      this.showError(errorMessage);
    }
  }

  /**
   * Cancel the AI dialog and return to PICKING state
   *
   * Called when user presses ESC while dialog is open.
   * Hides the dialog and transitions state back to PICKING,
   * allowing the user to select a different element.
   */
  private cancelAiDialog(): void {
    this.hideAiDialog();
    this.state = 'PICKING';
  }

  /**
   * Clean up all side effects
   */
  private cleanup(): void {
    // Detach event listeners
    this.detachEventListeners();

    // Hide AI dialog if it's showing
    this.hideAiDialog();

    // Remove overlay container
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }

    // Clear references
    this.highlightOverlay = null;
    this.infoLabel = null;
    this.currentElement = null;
  }
}

// ==================== Global Instance ====================

let pickerInstance: ElementPicker | null = null;

/**
 * Start the element picker mode
 */
export const startPicker = (): void => {
  if (!pickerInstance) {
    pickerInstance = new ElementPicker();
  }
  pickerInstance.start();
};

/**
 * Stop the element picker mode
 */
export const stopPicker = (): void => {
  if (pickerInstance) {
    pickerInstance.stop();
  }
};

// ==================== 消息监听器 ====================

/**
 * 监听来自Background Script的消息
 */
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as {
    type: string;
    payload: {operations?: unknown[]; error?: string};
  };

  if (msg.type === 'APPLY_OPERATIONS') {
    console.log('[ElementPicker] 收到操作指令');

    if (msg.payload.error) {
      // 有错误，显示错误信息
      if (pickerInstance) {
        pickerInstance['showError'](msg.payload.error);
      }
    } else if (msg.payload.operations) {
      // 有操作指令，执行操作
      if (pickerInstance) {
        pickerInstance['handleApplyOperations'](msg.payload.operations);
      }
    }
  }

  return false;
});
