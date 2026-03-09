/**
 * Picker state type definition
 * - IDLE: Picker is not active
 * - PICKING: User is selecting an element
 * - SELECTED: Element is selected, AI dialog is displayed
 */
export type PickerState = 'IDLE' | 'PICKING' | 'SELECTED';

/**
 * 覆盖层管理器
 * 负责元素高亮、信息标签和定位计算
 */
export class OverlayManager {
  public overlayContainer: HTMLElement | null = null;
  public highlightOverlay: HTMLElement | null = null;
  public infoLabel: HTMLElement | null = null;

  /**
   * 创建覆盖层 DOM 元素
   */
  createOverlay(): void {
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'picker-overlay-root';
    this.overlayContainer.style.cssText =
      'position: fixed; top: 0; left: 0; width: 0; height: 0;';

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

    this.overlayContainer.appendChild(this.highlightOverlay);
    this.overlayContainer.appendChild(this.infoLabel);
    document.body.appendChild(this.overlayContainer);
  }

  /**
   * 移除覆盖层
   */
  removeOverlay(): void {
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }

    this.highlightOverlay = null;
    this.infoLabel = null;
  }

  /**
   * 更新覆盖层位置和内容
   */
  updateOverlay(target: HTMLElement): void {
    if (!this.highlightOverlay || !this.infoLabel) return;

    try {
      const rect = target.getBoundingClientRect();

      this.highlightOverlay.style.display = 'block';
      this.highlightOverlay.style.left = `${rect.left}px`;
      this.highlightOverlay.style.top = `${rect.top}px`;
      this.highlightOverlay.style.width = `${rect.width}px`;
      this.highlightOverlay.style.height = `${rect.height}px`;

      this.infoLabel.style.display = 'block';
      const labelPos = this.calculateLabelPosition(rect);
      this.infoLabel.style.left = `${labelPos.x}px`;
      this.infoLabel.style.top = `${labelPos.y}px`;

      this.updateLabelContent(target, rect);
    } catch (error) {
      console.error('[OverlayManager] Error updating overlay:', error);
    }
  }

  /**
   * 隐藏覆盖层
   */
  hideOverlay(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.style.display = 'none';
    }
    if (this.infoLabel) {
      this.infoLabel.style.display = 'none';
    }
  }

  /**
   * 计算信息标签的智能位置
   */
  private calculateLabelPosition(rect: DOMRect): {x: number; y: number} {
    const labelWidth = 150;
    const labelHeight = 50;
    const gap = 8;

    const candidates = [
      {x: rect.right + gap, y: rect.top},
      {x: rect.right + gap, y: rect.bottom - labelHeight},
      {x: rect.left - labelWidth - gap, y: rect.top},
      {x: rect.left - labelWidth - gap, y: rect.bottom - labelHeight},
    ];

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

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

    return {x: rect.left, y: rect.top};
  }

  /**
   * 计算 AI 对话框的最佳位置
   */
  calculateDialogPosition(rect: DOMRect): {x: number; y: number} {
    const dialogWidth = 300;
    const dialogHeight = 120;
    const gap = 12;

    const candidates = [
      {x: rect.right + gap, y: rect.top},
      {x: rect.right + gap, y: rect.bottom - dialogHeight},
      {x: rect.left - dialogWidth - gap, y: rect.top},
      {x: rect.left - dialogWidth - gap, y: rect.bottom - dialogHeight},
    ];

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

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

    return {x: rect.left, y: rect.top};
  }

  /**
   * 更新标签内容
   */
  private updateLabelContent(target: HTMLElement, rect: DOMRect): void {
    if (!this.infoLabel) return;

    const tagName = target.tagName.toLowerCase();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    let html = `<span style='color: #569CD6;'>${this.escapeHtml(tagName)}</span> `;
    html += `<span style='color: #b5cea8;'>${width}x${height}</span>`;

    if (target.id || target.className) {
      html += '<div>';
      if (target.id) {
        html += `<span style='color: #DCDCAA;'>#${this.escapeHtml(target.id)}</span> `;
      }
      if (target.className && typeof target.className === 'string') {
        const classes = target.className
          .split(' ')
          .filter((c) => c)
          .map((c) => `.${this.escapeHtml(c)}`)
          .join(' ');
        if (classes) {
          html += `<span style='color: #CE9178;'>${classes}</span>`;
        }
      }
      html += '</div>';
    }

    this.infoLabel.innerHTML = html;
  }

  /**
   * 转义 HTML 防止 XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
