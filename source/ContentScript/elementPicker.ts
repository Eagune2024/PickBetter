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
 * - Highlighting elements on hover
 * - Handling element selection on click
 * - Supporting keyboard shortcuts (ESC to cancel)
 * - Managing event listeners and cleanup
 */
export class ElementPicker {
  private isActive = false;
  private currentElement: HTMLElement | null = null;

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

    // Remove highlight from previous element
    if (this.currentElement && this.currentElement !== target) {
      this.unhighlight(this.currentElement);
    }

    // Highlight current element
    this.currentElement = target;
    this.highlight(this.currentElement);
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
    const elementInfo = {
      tagName: target.tagName,
      id: target.id || undefined,
      className: target.className || undefined,
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
   * Highlight an element with visual feedback
   */
  private highlight(element: HTMLElement): void {
    element.style.setProperty('outline', '2px solid #2196F3', 'important');
    element.style.setProperty('outline-offset', '-2px', 'important');
    element.style.setProperty('cursor', 'crosshair', 'important');
  }

  /**
   * Remove highlight from an element
   */
  private unhighlight(element: HTMLElement): void {
    element.style.setProperty('outline', '', 'important');
    element.style.setProperty('outline-offset', '', 'important');
    element.style.setProperty('cursor', '', 'important');
  }

  /**
   * Clean up all side effects
   */
  private cleanup(): void {
    // Detach event listeners
    this.detachEventListeners();

    // Remove highlight from current element
    if (this.currentElement) {
      this.unhighlight(this.currentElement);
      this.currentElement = null;
    }
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
