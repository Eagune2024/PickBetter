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

/**
 * 获取存储中的 AI 模型配置
 */
async function getAIModelConfig(): Promise<{
  apiKey?: string;
  provider?: string;
  modelName?: string;
} | null> {
  try {
    // 尝试从 storage.local 获取配置
    if (browser.storage?.local) {
      const result = await browser.storage.local.get('aiModel');
      return (result.aiModel as {
        apiKey?: string;
        provider?: string;
        modelName?: string;
      } | null) ?? null;
    }

    // 降级处理：使用 chrome API
    if (
      typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome?.storage?.local
    ) {
      return new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).chrome.storage.local.get(['aiModel'], (result: any) => {
          resolve(result.aiModel ?? null);
        });
      });
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 打开扩展的 Options 页面
 *
 * 注意：内容脚本不能直接调用 chrome.runtime.openOptionsPage()
 * 需要通过消息通知后台脚本执行
 */
function openOptionsPage(): void {
  // 发送消息到后台脚本，请求打开选项页
  browser.runtime
    .sendMessage({type: 'OPEN_OPTIONS'})
    .catch((err) => {
      console.error('[ElementPicker] 发送打开选项页消息失败:', err);
    });
}


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
   * Create AI dialog DOM element
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
   * Calculate smart position for AI dialog
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
   * Show AI dialog for selected element
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
   * Hide AI dialog
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
   * Submit AI prompt
   */
  private async submitAiPrompt(): Promise<void> {
    const prompt = this.dialogInput?.value || '';

    console.log('[ElementPicker] AI Prompt:', prompt);
    console.log(
      '[ElementPicker] 选中元素:',
      this.getElementInfo(this.selectedElement)
    );

    // 检查是否配置了 AI 模型
    try {
      const aiModel = await getAIModelConfig();

      // 如果没有配置 AI 模型，打开 Options 页面
      if (!aiModel || !aiModel.apiKey) {
        console.log('[ElementPicker] 未检测到 AI 模型配置，打开设置页面');

        // 显示提示信息
        if (this.aiDialog) {
          this.aiDialog.innerHTML = `
            <div style="
              font-size: 14px;
              margin-bottom: 8px;
              color: #f59e0b;
              font-weight: 500;
            ">⚠️ 未配置 AI 模型</div>
            <div style="
              font-size: 12px;
              color: #d4d4d4;
              margin-bottom: 12px;
            ">请先在设置页面配置 AI 模型</div>
            <button id="openSettingsBtn" style="
              width: 100%;
              padding: 8px 12px;
              border: none;
              border-radius: 4px;
              background: #2196F3;
              color: white;
              font-size: 14px;
              cursor: pointer;
              font-weight: 500;
            ">打开设置</button>
          `;

          // 添加按钮点击事件
          const openSettingsBtn =
            this.aiDialog.querySelector('#openSettingsBtn');
          openSettingsBtn?.addEventListener('click', () => {
            openOptionsPage();
          });
        }
        return;
      }

      // TODO: 已配置 AI 模型，实现 AI 交互
      console.log('[ElementPicker] AI 模型已配置:', aiModel);

      // Hide dialog and return to PICKING state
      this.hideAiDialog();
      this.state = 'PICKING';
    } catch (error) {
      console.error('[ElementPicker] 检查 AI 配置时出错:', error);

      // 出错时也尝试打开设置页面
      openOptionsPage();

      // Hide dialog and return to PICKING state
      this.hideAiDialog();
      this.state = 'PICKING';
    }
  }

  /**
   * Cancel AI dialog
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
