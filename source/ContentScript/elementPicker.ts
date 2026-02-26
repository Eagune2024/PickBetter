/**
 * Element Picker Module
 *
 * Provides a visual element selection capability for the browser extension.
 * Users can activate picker mode, hover over elements to highlight them,
 * and click to select elements (outputs info to console).
 *
 * Usage:
 *   import {startPicker, stopPicker} from './elementPicker';
 *   startPicker();  // Activate picker mode
 *   stopPicker();   // Deactivate picker mode
 */

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
  private isActive = false;
  private currentElement: HTMLElement | null = null;

  // Overlay DOM elements
  private overlayContainer: HTMLElement | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private infoLabel: HTMLElement | null = null;

  // Event handlers bound to the instance
  private readonly handleMouseOver: (e: MouseEvent) => void;
  private readonly handleClick: (e: MouseEvent) => void;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    // Bind event handlers to instance methods
    this.handleMouseOver = this.handleMouseOverImpl.bind(this);
    this.handleClick = this.handleClickImpl.bind(this);
    this.handleKeyDown = this.handleKeyDownImpl.bind(this);
  }

  /**
   * Start the element picker mode
   */
  public start(): void {
    if (this.isActive) {
      console.log('[ElementPicker] 选择模式已激活,无需重复启动');
      return;
    }

    this.isActive = true;
    this.createOverlay();
    this.attachEventListeners();
    console.log('[ElementPicker] 选择模式已启动,按ESC退出');
  }

  /**
   * Stop the element picker mode
   */
  public stop(): void {
    if (!this.isActive) {
      return;
    }

    this.cleanup();
    this.isActive = false;
    console.log('[ElementPicker] 选择模式已退出');
  }

  /**
   * Create overlay DOM elements
   */
  private createOverlay(): void {
    // Create container
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'picker-overlay-root';
    this.overlayContainer.style.cssText =
      'position: absolute; top: 0; left: 0; width: 0; height: 0;';

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
   * Attach event listeners for picker mode
   */
  private attachEventListeners(): void {
    // Use capture phase to intercept events before page handlers
    document.addEventListener('mouseover', this.handleMouseOver, {
      capture: true,
    });
    document.addEventListener('click', this.handleClick, {capture: true});
    document.addEventListener('keydown', this.handleKeyDown);
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
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle mouse over events
   */
  private handleMouseOverImpl(e: MouseEvent): void {
    if (!this.isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;

    // Skip if highlighting the same element
    if (this.currentElement === target) return;

    // Update current element
    this.currentElement = target;

    // Update overlay
    this.updateOverlay(target);
  }

  /**
   * Handle click events
   */
  private handleClickImpl(e: MouseEvent): void {
    if (!this.isActive) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target as HTMLElement;

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

    // Stop picker mode
    this.stop();
  }

  /**
   * Handle key down events
   */
  private handleKeyDownImpl(e: KeyboardEvent): void {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
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
   * Clean up all side effects
   */
  private cleanup(): void {
    // Detach event listeners
    this.detachEventListeners();

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
